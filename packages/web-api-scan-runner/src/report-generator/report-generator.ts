// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator } from 'common';
import { inject, injectable } from 'inversify';
import { AxeScanResults } from 'scanner-global-library';
import { ReportFormat } from 'storage-documents';
import { iocTypeNames } from '../ioc-types';
import { AxeResultConverter, AxeResultConverterOptions } from './axe-result-converter';

export type GeneratedReport = {
    content: string;
    id: string;
    format: ReportFormat;
};

@injectable()
export class ReportGenerator {
    constructor(
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(iocTypeNames.AxeResultConverters) private readonly axeResultConverters: AxeResultConverter[],
    ) {}

    public generateReports(axeResults: AxeScanResults): GeneratedReport[] {
        const options = {
            pageTitle: axeResults.pageTitle,
        } as AxeResultConverterOptions;

        return this.axeResultConverters.map<GeneratedReport>((axeResultConverter) => {
            return {
                content: axeResultConverter.convert(axeResults.results, options),
                id: this.guidGenerator.createGuid(),
                format: axeResultConverter.targetReportFormat,
            };
        });
    }
}
