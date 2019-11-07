// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { VError } from 'verror';
import { CosmosOperationResponse } from '../azure-cosmos/cosmos-operation-response';

export namespace client {
    export function isSuccessStatusCode<T>(response: CosmosOperationResponse<T>): boolean {
        return response.statusCode !== undefined && response.statusCode >= 200 && response.statusCode <= 299;
    }

    export function ensureSuccessStatusCode<T>(response: CosmosOperationResponse<T>): void {
        if (!isSuccessStatusCode(response)) {
            throw new VError(
                `Failed request response - ${JSON.stringify({
                    statusCode: response.statusCode === undefined ? 'undefined' : response.statusCode,
                    response: response.response === undefined ? 'undefined' : response.response,
                })}`,
            );
        }
    }
}
