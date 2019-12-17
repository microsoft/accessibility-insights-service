// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { AIScanner } from './ai-scanner';
import { AxeScanResults } from './axe-scan-results';
@injectable()
export class ScanRunner {
    constructor(@inject(AIScanner) private readonly scanner: AIScanner) {}

    public async scan(url: string): Promise<AxeScanResults> {
        try {
            return await this.scanner.scan(url);
        } catch (error) {
            console.log(`Page scan run failed.`, { error });
            throw error;
        }
    }
}
