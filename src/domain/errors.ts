/**
 * Error types for the Portfolio Performance calculation engine.
 */

export const enum EngineErrorCode {
    STATE_NOT_INITIALIZED = 'STATE_NOT_INITIALIZED',
    CALCULATION_OVERFLOW = 'CALCULATION_OVERFLOW',
    INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
    WORKER_TERMINATED = 'WORKER_TERMINATED',
}

export interface EngineError {
    code: EngineErrorCode;
    message: string;
    recoverable: boolean;
}

export class EngineException extends Error {
    constructor(
        public code: EngineErrorCode,
        message: string,
        public recoverable: boolean = false
    ) {
        super(message);
        this.name = 'EngineException';
    }

    toEngineError(): EngineError {
        return {
            code: this.code,
            message: this.message,
            recoverable: this.recoverable,
        };
    }
}

/**
 * Parse unknown errors into EngineError format
 */
export function parseEngineError(err: unknown): EngineError {
    if (err instanceof EngineException) {
        return err.toEngineError();
    }

    if (err instanceof Error) {
        return {
            code: EngineErrorCode.CALCULATION_OVERFLOW,
            message: err.message,
            recoverable: true,
        };
    }

    return {
        code: EngineErrorCode.CALCULATION_OVERFLOW,
        message: String(err),
        recoverable: true,
    };
}
