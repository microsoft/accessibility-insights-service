// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ServiceConfiguration } from 'common';
import { injectable } from 'inversify';
import { Logger } from 'logger';
import { ApiController } from 'service-library';
import { getSarifReportMock } from '../providers/mock-sarif-report-provider';

@injectable()
export class ReportController extends ApiController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'web-api-mock';
    protected readonly logger: Logger;
    protected readonly serviceConfig: ServiceConfiguration;

    public async handleRequest(): Promise<void> {
        this.context.res = {
            status: 200, // OK
            body: getSarifReportMock(),
            headers: {
                'Content-Type': 'application/json',
            },
        };
    }
}
