export type TraceEventName =
  | "transaction_opened"
  | "stage_user_turn"
  | "stage_snapshot"
  | "stage_episode_write"
  | "stage_thread_update"
  | "stage_assistant_output"
  | "stage_async_job"
  | "commit_ready"
  | "commit_succeeded"
  | "commit_failed"
  | "rollback_started"
  | "rollback_completed"
  | "parser_failed"
  | "validation_failed"
  | "fallback_selected";

export interface TraceEvent {
  at: string;
  name: TraceEventName;
  data?: Record<string, unknown>;
}

export interface RuntimeTraceEnvelope {
  traceId: string;
  turnTxnId: string;
  sessionId: string;
  openedAt: string;
  outcome: "open" | "committed" | "rolled_back";
  commitId?: string;
  rollbackReason?: string;
  events: TraceEvent[];
}

export function createTraceEnvelope(turnTxnId: string, sessionId: string): RuntimeTraceEnvelope {
  return {
    traceId: `trace_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    turnTxnId,
    sessionId,
    openedAt: new Date().toISOString(),
    outcome: "open",
    events: [],
  };
}

export function appendTraceEvent(
  trace: RuntimeTraceEnvelope,
  name: TraceEventName,
  data?: Record<string, unknown>,
): RuntimeTraceEnvelope {
  trace.events.push({ at: new Date().toISOString(), name, data });
  return trace;
}

export function markTraceCommitted(trace: RuntimeTraceEnvelope, commitId: string): RuntimeTraceEnvelope {
  trace.outcome = "committed";
  trace.commitId = commitId;
  return trace;
}

export function markTraceRolledBack(trace: RuntimeTraceEnvelope, rollbackReason: string): RuntimeTraceEnvelope {
  trace.outcome = "rolled_back";
  trace.rollbackReason = rollbackReason;
  return trace;
}
