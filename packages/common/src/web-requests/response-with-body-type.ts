// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Response } from 'got';

// eslint-disable-next-line @typescript-eslint/ban-types
export interface ResponseWithBodyType<T = {}> extends Response {
    body: T;
}
