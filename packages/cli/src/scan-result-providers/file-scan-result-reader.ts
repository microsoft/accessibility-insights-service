// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ScanResult, ScanMetadata } from 'accessibility-insights-crawler';
import { ScanResultReader } from './scan-result-reader';

export class FileScanResultReader implements ScanResultReader {
    public [Symbol.asyncIterator](): AsyncIterator<ScanResult> {
        return this;
    }

    public async next(): Promise<IteratorResult<ScanResult>> {
        throw new Error('Method not implemented.');
    }

    public async getScanMetadata(baseUrl: string): Promise<ScanMetadata> {
        throw new Error('Method not implemented.');
    }
}
