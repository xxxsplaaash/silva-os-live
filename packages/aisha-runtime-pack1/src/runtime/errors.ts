export type TransactionErrorCode =
  | "invalid_stage_transition"
  | "journal_incomplete"
  | "commit_failed";

export type RollbackErrorCode =
  | "cannot_rollback_committed_turn"
  | "duplicate_rollback";

export type ParserErrorCode =
  | "empty_output"
  | "wrapped_in_code_fence"
  | "root_not_object"
  | "duplicate_top_level_key"
  | "json_parse_failed"
  | "unknown_field"
  | "invalid_field_type"
  | "invalid_enum_value";

class RuntimeShellError extends Error {
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = new.target.name;
    this.cause = cause;
  }
}

export class TransactionError extends RuntimeShellError {
  public readonly code: TransactionErrorCode;

  constructor(code: TransactionErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.code = code;
  }
}

export class RollbackError extends RuntimeShellError {
  public readonly code: RollbackErrorCode;

  constructor(code: RollbackErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.code = code;
  }
}

export class ParserError extends RuntimeShellError {
  public readonly code: ParserErrorCode;

  constructor(code: ParserErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.code = code;
  }
}
