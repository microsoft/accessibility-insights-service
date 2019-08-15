// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { getSarifReportMock } from '../../get-report/sarif-report-mock';
import { ApiController } from './api-controller';

export class GetReportController extends ApiController {
    public readonly apiVersion = '1.0';

    protected invokeImpl(): void {
        // To Do - add scan id regex validation in func binding
        this.context.res = {
            status: 200, // OK
            body: getSarifReportMock(),
            headers: {
                'Content-Type': 'application/json',
            },
        };
    }
}
