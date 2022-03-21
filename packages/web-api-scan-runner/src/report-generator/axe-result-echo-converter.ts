// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { ReportFormat } from 'storage-documents';
import { AxeScanResults } from 'scanner-global-library';
import { AxeResultConverter } from './axe-result-converter';

@injectable()
export class AxeResultEchoConverter implements AxeResultConverter {
    public readonly targetReportFormat: ReportFormat = 'axe';

    public convert(axeScanResults: AxeScanResults): string {
        return JSON.stringify(axeScanResults);
    }
}
