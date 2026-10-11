import type { RealtimeError, RealtimeErrorCode } from "./types.js";
export declare class RealtimeException extends Error {
    readonly code: RealtimeErrorCode;
    readonly retryAfterMs?: number;
    constructor(code: RealtimeErrorCode, message: string, retryAfterMs?: number);
    toJSON(): RealtimeError;
}
export declare function isRealtimeError(value: unknown): value is RealtimeError;
export declare function formatRealtimeError(code: RealtimeErrorCode, message: string): RealtimeError;
//# sourceMappingURL=errors.d.ts.map