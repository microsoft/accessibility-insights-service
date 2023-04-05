// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import { injectable } from 'inversify';

@injectable()
export class BrowserCache {
    public readonly dirname = `${__dirname}/browser-cache`;

    constructor(private readonly filesystem: typeof fs = fs) {}

    public clear(): void {
        this.filesystem.rmSync(this.dirname, { recursive: true, force: true });
    }
}
