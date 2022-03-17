// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AxeResults } from 'axe-core';
import { injectable } from 'inversify';
import { ReportFormat } from 'storage-documents';
import { AxeResultConverter } from './axe-result-converter';

@injectable()
export class AxeResultEchoConverter implements AxeResultConverter {
    public readonly targetReportFormat: ReportFormat = 'axe';

    public convert(results: AxeResults): string {
        return JSON.stringify(results);
    }
}
