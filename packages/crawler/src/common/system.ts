// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as utils from 'util';
import { serializeError as serializeErrorExt } from 'serialize-error';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types */

export namespace System {
    export async function wait(timeoutMillisecond: number): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, timeoutMillisecond));
    }

    export function serializeError(error: any): string {
        return utils.inspect(serializeErrorExt(normalizeHttpResponse(error)), false, null);
    }

    /**
     * Normalizes request object from the HTTP response object
     * @param httpResponse The HTTP response object
     */
    export function normalizeHttpResponse(httpResponse: any): any {
        if (httpResponse === undefined || (httpResponse.request === undefined && httpResponse.response === undefined)) {
            return httpResponse;
        }

        const getRequest = (request: any) => {
            const { headers, body, operationSpec, ...requestCopy } = request;

            return requestCopy;
        };

        const getResponse = (response: any) => {
            const { headers, request, ...responseCopy } = response;

            return responseCopy;
        };

        const { request, response, ...httpResponseCopy } = httpResponse;
        if (request) {
            httpResponseCopy.request = getRequest(request);
        }

        if (response) {
            httpResponseCopy.response = getResponse(response);
        }

        return httpResponseCopy;
    }

    /**
     * Returns elapsed time since the given timestamp, in msec
     * @param timestamp The timestamp to use as start timestamp to calculate elapsed time, in msec.
     * Use ```System.getTimestamp()``` to get timestamp value
     */
    export function getElapsedTime(timestamp: number): number {
        return getTimestamp() - timestamp;
    }

    /**
     * Returns current time, in msec
     */
    export function getTimestamp(): number {
        return Number(process.hrtime.bigint() / 1000000n);
    }
}
