// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable: no-implicit-dependencies

import { inject, injectable } from 'inversify';
import { AxeScanResults, Scanner } from 'scanner';

@injectable()
export class ScannerTask {
    constructor(@inject(Scanner) private readonly scanner: Scanner) {}

    public async scan(url: string): Promise<AxeScanResults> {
        return this.scanner.scan(url);
    }
}
