// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AxeResults } from 'axe-core';
import { ReportFormat } from 'storage-documents';

export type ReportGenerationParams = {
    pageTitle: string;
    browserSpec: string;
};

export interface AxeResultConverter {
    readonly targetReportFormat: ReportFormat;

    convert(results: AxeResults, params: ReportGenerationParams): string;
}
