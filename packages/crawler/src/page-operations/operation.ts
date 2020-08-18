// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export declare type OperationType = 'no-op' | 'click';

export interface Operation {
    operationType: OperationType;
    data: unknown;
}
