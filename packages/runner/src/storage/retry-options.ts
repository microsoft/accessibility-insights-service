export interface RetryOptions {
    timeoutMilliseconds: number;
    intervalMilliseconds: number;
    retryingOnStatusCodes: number[];
}
