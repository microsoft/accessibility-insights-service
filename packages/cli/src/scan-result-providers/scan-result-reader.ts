// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ScanResult, ScanMetadata } from 'accessibility-insights-crawler';

export interface ScanResultReader extends AsyncIterable<ScanResult> {
    getScanMetadata(baseUrl: string): Promise<ScanMetadata>;
    next(): Promise<IteratorResult<ScanResult>>;
}
