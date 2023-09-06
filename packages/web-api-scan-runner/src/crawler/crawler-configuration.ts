// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';

@injectable()
export class CrawlerConfiguration {
    public setApifySettings(workingDirectory: string): void {
        process.env.CRAWLEE_HEADLESS = '1';
        process.env.CRAWLEE_STORAGE_DIR = workingDirectory;
    }
}
