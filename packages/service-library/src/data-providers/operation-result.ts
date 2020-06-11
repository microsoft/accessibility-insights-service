// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
export interface OperationResult<T> {
    succeeded: boolean;
    result?: T;
}
