// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Url } from 'url';

interface SerializableRequest {
    uri: Url;
    method: string;
    headers: { [key: string]: unknown };
}

export interface SerializableResponse<T = {}> {
    statusCode: number;
    body: T;
    headers: { [key: string]: unknown };
    request: SerializableRequest;
}
