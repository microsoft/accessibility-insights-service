// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fsNode from 'fs';
import { injectable } from 'inversify';

@injectable()
export class BrowserCache {
    public readonly dirname = `${__dirname}/browser-cache`;

    constructor(private readonly fs: typeof fsNode = fsNode) {}

    public clear(): void {
        this.fs.rmSync(this.dirname, { recursive: true, force: true });
    }
}
