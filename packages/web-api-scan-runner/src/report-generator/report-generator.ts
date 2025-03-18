// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator } from 'common';
import { inject, injectable } from 'inversify';
import { AxeScanResults } from 'scanner-global-library';
import { GeneratedReport } from 'service-library';
import { iocTypeNames } from '../ioc-types';
import { AxeResultConverter } from './axe-result-converter';

@injectable()
export class ReportGenerator {
    constructor(
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(iocTypeNames.AxeResultConverters) private readonly axeResultConverters: AxeResultConverter[],
    ) {}

    public generateReports(axeScanResults: AxeScanResults): GeneratedReport[] {
        return this.axeResultConverters.map<GeneratedReport>((axeResultConverter) => {
            return {
                content: axeResultConverter.convert(axeScanResults),
                id: this.guidGenerator.createGuid(),
                format: axeResultConverter.targetReportFormat,
                source: 'accessibility-scan',
            };
        });
    }
}
