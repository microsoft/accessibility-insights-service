// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-any
export interface CosmosOperationResponse<T> {
    item?: T;
    response?: any;
    statusCode: number;
    continuationToken?: string;
}
