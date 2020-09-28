// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { VError } from 'verror';

export interface ErrorResponse {
    statusCode: number;
    response: unknown;
}

export namespace client {
    export function isSuccessStatusCode(response: { statusCode: number }): boolean {
        return response.statusCode !== undefined && response.statusCode >= 200 && response.statusCode <= 299;
    }

    export function ensureSuccessStatusCode(response: { statusCode: number }): void {
        if (!isSuccessStatusCode(response)) {
            throw new VError(
                `Failed request response - ${JSON.stringify({
                    statusCode: response.statusCode === undefined ? 'undefined' : response.statusCode,
                    response: response === undefined ? 'undefined' : response,
                })}`,
            );
        }
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
    export function getErrorResponse(error: any): ErrorResponse {
        if (error.code !== undefined) {
            return {
                response: error.message,
                statusCode: error.code,
            };
        } else {
            return undefined;
        }
    }
}
