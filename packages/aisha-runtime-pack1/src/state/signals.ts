export interface ConversationalSignals {
  // Impulses scored 0.0 to 1.0 based on presence in the current turn
  praise_or_validation: number;
  contradiction_or_frustration: number;
  task_or_build_request: number;
  uncertainty_or_hedge: number;
}

export interface ISignalClassifier {
  classify(text: string): Promise<ConversationalSignals>;
}

export class RegexSignalClassifier implements ISignalClassifier {
  async classify(text: string): Promise<ConversationalSignals> {
    const lower = text.toLowerCase();
    
    let praise_or_validation = 0;
    let contradiction_or_frustration = 0;
    let task_or_build_request = 0;
    let uncertainty_or_hedge = 0;

    if (/\b(thanks|thank you|great|love this|perfect)\b/.test(lower)) {
      praise_or_validation = 1.0;
    }

    if (/\b(actually|not anymore|no longer|stopped|instead|changed)\b/.test(lower)) {
      contradiction_or_frustration = 1.0;
    }

    if (/\b(help|plan|implement|build|fix)\b/.test(lower)) {
      task_or_build_request = 1.0;
    }

    if (/\b(maybe|not sure|unsure)\b/.test(lower)) {
      uncertainty_or_hedge = 1.0;
    }

    return {
      praise_or_validation,
      contradiction_or_frustration,
      task_or_build_request,
      uncertainty_or_hedge,
    };
  }
}
