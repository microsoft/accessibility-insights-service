// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AxeResults } from 'axe-core';
import { injectable } from 'inversify';
import { ReportFormat } from 'storage-documents';

export type ReportGenerationParams = {
    pageTitle: string;
};

@injectable()
export abstract class AxeResultConverter {
    public readonly reportType: ReportFormat;

    public abstract convert(results: AxeResults, params: ReportGenerationParams): string;
}
