// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { getSarifReportMock } from '../sarif-report-mock';
import { ApiController } from './api-controller';

export class ReportController extends ApiController {
    public readonly apiVersion = '1.0';

    public getReport(): void {
        this.context.res = {
            status: 200, // OK
            body: getSarifReportMock(),
            headers: {
                'Content-Type': 'application/json',
            },
        };
    }
}
