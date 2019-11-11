// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { WebController } from 'service-library';
import { A11yServiceClient } from 'web-api-client';

// tslint:disable: no-any

@injectable()
export class HealthMonitorClientController extends WebController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'health-monitor-client';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) contextAwareLogger: ContextAwareLogger,
        @inject(A11yServiceClient) protected webApiClient: A11yServiceClient,
    ) {
        super(contextAwareLogger);
    }

    protected async handleRequest(...args: any[]): Promise<unknown> {
        const activityActionName = args[0];
        this.contextAwareLogger.logInfo(`Executing ${activityActionName} activity action.`);

        return 'hello';
        // switch (activityActionName) {
        //     case 'createScanRequest': {
        //         this.createScanRequest();
        //         break;
        //     }
        //     case 'getScanResult': {
        //         this.getScanResult();
        //         break;
        //     }
        //     case 'getScanResultBatch': {
        //         this.getScanResultBatch();
        //         break;
        //     }
        //     case 'getScanReport': {
        //         this.getScanReport();
        //         break;
        //     }
        //     case 'getHealthStatus': {
        //         this.getHealthStatus();
        //         break;
        //     }
        //     default: {
        //         this.contextAwareLogger.logInfo(`Unrecognized activity action ${activityActionName}.`);
        //     }
        // }
    }

    protected validateRequest(...args: any[]): boolean {
        return true;
    }

    private createScanRequest(): void {
        return;
    }

    private getScanResult(): void {
        return;
    }

    private getScanResultBatch(): void {
        return;
    }

    private getScanReport(): void {
        return;
    }

    private getHealthStatus(): void {
        return;
    }
}
