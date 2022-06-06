// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as crypto from 'crypto';
import * as utils from 'util';
import { isNil } from 'lodash';
import { serializeError as serializeErrorExt } from 'serialize-error';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types */

export namespace System {
    export function createInstanceIfNil<T>(instance: T, factory: () => T): T {
        if (isNil(instance)) {
            return factory();
        }

        return instance;
    }

    export function isNullOrEmptyString(str: string): boolean {
        return isNil(str) || str.length === 0;
    }

    export function chunkArray<T>(sourceArray: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        for (let index = 0; index < sourceArray.length; index += chunkSize) {
            chunks.push(sourceArray.slice(index, index + chunkSize));
        }

        return chunks;
    }

    export async function wait(timeoutMillisecond: number): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, timeoutMillisecond));
    }

    export function createRandomString(length: number = 32): string {
        const bytes = length % 2 === 0 ? length / 2 : (length + 1) / 2;

        return crypto.randomBytes(bytes).toString('hex').substr(0, length);
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

    export function getTimestamp(): number {
        return Number(process.hrtime.bigint() / 1000000n);
    }
}
