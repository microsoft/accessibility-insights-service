// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ResponseWithBodyType } from './a11y-service-client';

interface SerializableRequest {
    uri: URL;
    method: string;
    headers: { [key: string]: unknown };
}

export interface SerializableResponse<T = unknown> {
    statusCode: number;
    body: T;
    headers: { [key: string]: unknown };
    request: SerializableRequest;
}

export type ResponseSerializer = typeof getSerializableResponse;

export function getSerializableResponse<T>(response: ResponseWithBodyType<T>): SerializableResponse<T> {
    const requestOptions = response.request?.options;

    return {
        statusCode: response.statusCode,
        body: response.body,
        headers: response.headers,
        request: {
            uri: requestOptions?.url,
            method: requestOptions?.method,
            headers: requestOptions?.headers,
        },
    };
}
