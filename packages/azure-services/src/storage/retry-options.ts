// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
export interface RetryOptions {
    timeoutMilliseconds: number;
    intervalMilliseconds: number;
    retryingOnStatusCodes: number[];
}
