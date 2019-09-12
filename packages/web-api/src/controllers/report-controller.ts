// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Context } from '@azure/functions';
import { ServiceConfiguration } from 'common';
import { Logger } from 'logger';
import { getSarifReportMock } from '../providers/mock-sarif-report-provider';
import { ApiController } from './api-controller';

export class ReportController extends ApiController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'web-api-mock';
    protected readonly logger: Logger;
    protected readonly serviceConfig: ServiceConfiguration;

    constructor(protected readonly context: Context) {
        super();
    }

    public async handleRequest(): Promise<void> {
        return;
    }

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
