// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AxeResults } from 'axe-core';
import { ReportFormat } from 'storage-documents';

export type AxeResultConverterOptions = {
    pageTitle?: string;
    reportId?: string;
    baseUrl?: string;
    userAgent?: string;
    scanStarted?: Date;
};

export interface AxeResultConverter {
    readonly targetReportFormat: ReportFormat;
    convert(results: AxeResults, options: AxeResultConverterOptions): string;
}
