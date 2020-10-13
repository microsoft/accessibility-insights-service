// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { isNil } from 'lodash';
import { ResponseWithBodyType } from './response-with-body-type';

interface SerializableRequest {
    uri: URL;
    method: string;
    headers: { [key: string]: unknown };
}

export interface SerializableResponse<T = unknown> {
    statusCode: number;
    body: T;
    headers: { [key: string]: unknown };
    request?: SerializableRequest;
}

export type ResponseSerializer = typeof getSerializableResponse;

export function getSerializableResponse<T>(response: ResponseWithBodyType<T>): SerializableResponse<T> {
    const serializable: SerializableResponse<T> = {
        statusCode: response.statusCode,
        body: response.body,
        headers: response.headers,
    };

    if (!isNil(response.request)) {
        const requestOptions = response.request.options;
        serializable.request = {
            uri: requestOptions.url,
            method: requestOptions.method,
            headers: requestOptions.headers,
        };
    }

    return serializable;
}
