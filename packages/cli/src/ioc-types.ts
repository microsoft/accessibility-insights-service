// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ScanResultReader } from './scan-result-providers/scan-result-reader';

export const iocTypes = {
    ScanResultReaderFactory: 'Factory<ScanResultReader>',
    RunOptions: 'RunOptions',
    ReporterFactory: 'ReporterFactory',
};

export type ScanResultReaderFactory = () => ScanResultReader;
