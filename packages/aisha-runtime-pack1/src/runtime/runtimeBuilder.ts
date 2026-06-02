import { CompoundStateEngine } from "../state/compoundStateEngine";
import { RegexSignalClassifier } from "../state/signals";
import { GeminiGeneratorAdapter } from "../generation/geminiGeneratorAdapter";
import { ProductionParser } from "./productionParser";
import { MinimalRuntimeValidator } from "./validator";
import { InMemoryRuntimeTransaction } from "./transaction";
import { JournalRollbackHelper } from "./rollback";
import { CautiousFallbackHandler } from "../governance/fallback";

import { SimpleContextBuilder } from "../memory/contextBuilder";
import { DeterministicEpisodeBoundaryDetector } from "../memory/episodeBoundary";
import { SimpleNoteExtractionSandbox } from "../memory/noteExtractionSandbox";
import { SimpleRetrievalPlanner } from "../memory/retrievalPlanner";

import type { ProcessTurnDeps } from "./runtime_types";
import { BoundedCriticLoop } from "./criticLoop";
import { InMemoryAsyncMemoryFollowup } from "./inMemoryAsyncMemoryFollowup";
import type {
  IEpisodeStore,
  ISnapshotStore,
  IThreadStore,
  ITurnStore,
  INoteVersioning,
} from "../memory/types";
import type {
  IClock,
  IIdGenerator,
  IRuntimeTransaction,
  ITraceFactory,
  IRuntimeTrace,
  TraceEvent,
  RuntimeTraceSnapshot,
} from "./runtime_types";
// Pack 3.14c: shadow evidence collection at composition root
import { ShadowEvidenceStore } from "../research/shadowEvidenceStore";
import { ShadowEvidenceCollector } from "../research/shadowEvidenceCollector";

class SystemClock implements IClock {
  nowIso(): string {
    return new Date().toISOString();
  }
}

class ProductionIdGenerator implements IIdGenerator {
  private counters = new Map<string, number>();
  private readonly processNonce = Math.random().toString(36).slice(2, 8);

  next(prefix: string): string {
    const nextValue = (this.counters.get(prefix) ?? 0) + 1;
    this.counters.set(prefix, nextValue);
    const time = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);
    return `${prefix}_${time}_${this.processNonce}_${nextValue}_${random}`;
  }
}

class RuntimeTrace implements IRuntimeTrace {
  private status: "running" | "succeeded" | "failed" = "running";
  private failureReason?: string;
  private readonly events: TraceEvent[] = [];

  constructor(
    private readonly traceId: string,
    private readonly sessionId: string,
  ) {}

  add(event: TraceEvent): void {
    this.events.push({
      ...event,
      data: event.data ? { ...event.data } : undefined,
    });
  }

  fail(reason: string, _error?: unknown): void {
    this.status = "failed";
    this.failureReason = reason;
  }

  succeed(): void {
    this.status = "succeeded";
  }

  snapshot(): RuntimeTraceSnapshot {
    return {
      traceId: this.traceId,
      sessionId: this.sessionId,
      status: this.status,
      events: this.events.map((event) => ({
        ...event,
        data: event.data ? { ...event.data } : undefined,
      })),
      failureReason: this.failureReason,
    };
  }
}

class RuntimeTraceFactory implements ITraceFactory {
  create(input: { traceId: string; sessionId: string }): IRuntimeTrace {
    return new RuntimeTrace(input.traceId, input.sessionId);
  }
}

export interface ProductionStores {
  turnStore: ITurnStore;
  snapshotStore: ISnapshotStore;
  episodeStore: IEpisodeStore;
  threadStore: IThreadStore;
  noteVersioning: INoteVersioning;
  runtimeTransaction?: IRuntimeTransaction;
  /**
   * Pack 3.14c: optional pre-created shadow evidence store.
   * When provided, the builder wraps it in a ShadowEvidenceCollector and
   * injects it into ProcessTurnDeps. When absent, a fresh store is created
   * internally. Either way a real collector is always wired — no manual
   * injection is required in real sessions.
   * When AISHA_SHADOW_ASSOCIATIVE and AISHA_SHADOW_TRACE are both OFF (default),
   * the store remains empty; there is no cost to keeping it alive.
   */
  shadowEvidenceStore?: ShadowEvidenceStore;
}

export interface ProductionRuntimeConfig {
  geminiApiKey?: string;
  geminiModel?: string;
  geminiMaxOutputTokens?: number;
  geminiTimeoutMs?: number;
  vertexGemini?: {
    enabled: boolean;
    projectId: string;
    location: string;
    locationFallbacks?: string[];
    keyFilename?: string;
    useApplicationDefaultCredentials?: boolean;
    fastModel?: string;
    proModel?: string;
  };
}

/**
 * Constructs the production ProcessTurnDeps for the real generator path.
 *
 * Move 1 scope only:
 * - real Gemini generation
 * - production parser
 * - keep async note extraction on the simple heuristic sandbox for now
 *
 * Do not wire the LLM extraction lane here yet. That belongs to Move 3.
 */
export function buildProductionRuntime(
  config: ProductionRuntimeConfig,
  stores: ProductionStores,
): ProcessTurnDeps {
  const generator = new GeminiGeneratorAdapter({
    apiKey: config.geminiApiKey,
    model: config.geminiModel ?? "gemini-2.5-flash",
    maxOutputTokens: config.geminiMaxOutputTokens ?? 1000,
    timeoutMs: config.geminiTimeoutMs ?? 4000,
    vertex: config.vertexGemini,
  });

  const retrievalPlanner = new SimpleRetrievalPlanner({
    turnStore: stores.turnStore,
    threadStore: stores.threadStore,
    episodeStore: stores.episodeStore,
    noteVersioning: stores.noteVersioning,
  });

  const asyncMemoryFollowup = new InMemoryAsyncMemoryFollowup({
    episodeStore: stores.episodeStore,
    turnStore: stores.turnStore,
    snapshotStore: stores.snapshotStore,
    noteExtractionSandbox: new SimpleNoteExtractionSandbox(),
    noteVersioning: stores.noteVersioning,
  });

  // Pack 3.14c: always instantiate a real shadow evidence store + collector.
  // The store is zero-cost when shadow flags are off (the Pack 3.12 flag check
  // in processTurn means collect() is never called unless
  // AISHA_SHADOW_ASSOCIATIVE=1 or AISHA_SHADOW_TRACE=1).
  // Callers may supply an existing store via stores.shadowEvidenceStore so that
  // evidence survives across dep rebuilds without re-injection.
  const shadowEvidenceStore = stores.shadowEvidenceStore ?? new ShadowEvidenceStore();
  const shadowEvidenceCollector = new ShadowEvidenceCollector(shadowEvidenceStore);

  return {
    turnStore: stores.turnStore,
    snapshotStore: stores.snapshotStore,
    episodeBoundary: new DeterministicEpisodeBoundaryDetector(),
    episodeStore: stores.episodeStore,
    threadStore: stores.threadStore,
    retrievalPlanner,
    contextBuilder: new SimpleContextBuilder(),

    stateEngine: new CompoundStateEngine({
      classifier: new RegexSignalClassifier(),
    }),
    generator,
    parser: new ProductionParser(),
    validator: new MinimalRuntimeValidator(),
    transaction: stores.runtimeTransaction ?? new InMemoryRuntimeTransaction(),
    rollback: new JournalRollbackHelper(),
    fallback: new CautiousFallbackHandler(),
    traceFactory: new RuntimeTraceFactory(),
    idGenerator: new ProductionIdGenerator(),
    clock: new SystemClock(),

    // Pack 1.4: bounded critic loop is active on the live generator path.
    // MAX_CRITIC_CYCLES = 2. Sync, before commit. Never aborts the turn.
    criticLoop: new BoundedCriticLoop({
      retrievalPlanner,
      generator,
      contextBuilder: new SimpleContextBuilder(),
    }),

    asyncMemoryFollowup,

    // Pack 3.14c: wired at composition root — always present in real sessions.
    shadowEvidenceCollector,
  };
}
