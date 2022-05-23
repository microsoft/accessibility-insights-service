// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
export interface AuthenticationMethod {
    authenticate(page: Puppeteer.Page, attemptNumber?: number): Promise<void>;
}
