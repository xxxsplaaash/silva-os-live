export interface ConversationalSignals {
    praise_or_validation: number;
    contradiction_or_frustration: number;
    task_or_build_request: number;
    uncertainty_or_hedge: number;
}
export interface ISignalClassifier {
    classify(text: string): Promise<ConversationalSignals>;
}
export declare class RegexSignalClassifier implements ISignalClassifier {
    classify(text: string): Promise<ConversationalSignals>;
}
