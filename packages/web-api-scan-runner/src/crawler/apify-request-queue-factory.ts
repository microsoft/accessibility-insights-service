// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import { injectable } from 'inversify';
import * as Crawlee from '@crawlee/puppeteer';

/* eslint-disable security/detect-non-literal-fs-filename */

@injectable()
export class ApifyRequestQueueFactory {
    private readonly requestQueueName = 'scanRequests';

    public constructor(private readonly fileSystem: typeof fs = fs) {}

    public async createRequestQueue(): Promise<Crawlee.RequestQueue> {
        this.clearRequestQueue();
        const requestQueue = await Crawlee.RequestQueue.open(this.requestQueueName);

        return requestQueue;
    }

    private clearRequestQueue(): void {
        const storageDir = process.env.CRAWLEE_STORAGE_DIR;
        if (this.fileSystem.existsSync(storageDir)) {
            this.fileSystem.rmSync(storageDir, { recursive: true });
        }
    }
}
