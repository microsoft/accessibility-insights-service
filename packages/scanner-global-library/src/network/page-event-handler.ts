// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';

/* eslint-disable @typescript-eslint/no-explicit-any */

export declare type PageEventHandler = (interceptedRequest: InterceptedRequest) => Promise<void>;

export interface InterceptedRequest {
    url: string;
    request: Puppeteer.HTTPRequest;
    response?: Puppeteer.HTTPResponse;
    interceptionId?: string;
    error?: string;
    data?: any;
}
