// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface CosmosOperationResponse<T> {
    item?: T;
    response?: any;
    statusCode: number;
    continuationToken?: string;
}
