// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator } from 'common';
import { inject } from 'inversify';
import { AxeScanResults } from 'scanner';
import { ReportFormat } from 'storage-documents';
import { iocTypeNames } from '../ioc-types';
import { AxeResultConverter } from './axe-result-converters';

export type GeneratedReport = {
    report: string;
    id: string;
    format: ReportFormat;
};

export class ReportGenerator {
    constructor(
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        private readonly axeResultConverters: AxeResultConverter[],
    ) {}

    public generateReports(axeResults: AxeScanResults): GeneratedReport[] {
        const params = { pageTitle: axeResults.pageTitle };

        return this.axeResultConverters.map<GeneratedReport>(axeResultConverter => {
            return {
                report: axeResultConverter.convert(axeResults.results, params),
                id: this.guidGenerator.createGuid(),
                format: axeResultConverter.reportType,
            };
        });
    }
}
