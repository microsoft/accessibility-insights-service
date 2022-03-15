// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TargetReport } from 'storage-documents';

export interface ReportGeneratorMetadata {
    id: string;
    scanGroupId: string;
    targetReport: TargetReport;
}
