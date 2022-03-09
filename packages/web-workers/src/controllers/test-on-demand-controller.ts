// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { WebController, OnDemandPageScanRunResultProvider } from 'service-library';
import { functionalTestGroupTypes, TestRunner, TestEnvironment, TestGroupConstructor } from 'functional-tests';
import { a11yServiceClientTypeNames, A11yServiceClientProvider } from 'web-api-client';
import { RunFunctionalTestGroupData } from './activity-request-data';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The ad-hoc controller to run e2e tests on demand when testing locally
 * Use with health-monitor-timer-func function to run
 */

@injectable()
export class TestOnDemandController extends WebController {
    public readonly apiVersion = '1.0';

    public readonly apiName = 'test-on-demand';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) logger: ContextAwareLogger,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(TestRunner) protected readonly testRunner: TestRunner,
        @inject(a11yServiceClientTypeNames.A11yServiceClientProvider) protected readonly webApiClientProvider: A11yServiceClientProvider,
        @inject(OnDemandPageScanRunResultProvider) protected readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        protected readonly testGroupTypes: { [key: string]: TestGroupConstructor } = functionalTestGroupTypes,
    ) {
        super(logger);
    }

    protected async handleRequest(...args: any[]): Promise<void> {
        this.logger.setCommonProperties({ source: 'testOnDemandFunc' });
        this.logger.logInfo(`Executing '${this.context.executionContext.functionName}' function.`, {
            funcName: this.context.executionContext.functionName,
            invocationId: this.context.executionContext.invocationId,
        });

        const data: RunFunctionalTestGroupData = {
            runId: '1',
            releaseId: '1',
            environment: TestEnvironment.canary,
            testContextData: {
                scanUrl: '',
                scanId: '', // set scanId
            },
            test: {
                testGroupName: 'ScanReports', // set functionalTestGroupTypes value that match to test group class (under functional-tests package) to run
                scenarioName: '',
            },
        };
        const webApiClient = await this.webApiClientProvider();
        const functionalTestGroupCtor = this.testGroupTypes[data.test.testGroupName];
        const functionalTestGroup = new functionalTestGroupCtor(webApiClient, this.onDemandPageScanRunResultProvider, this.guidGenerator);
        functionalTestGroup.setTestContext(data.testContextData);
        const testRunMetadata = {
            environment: data.environment,
            releaseId: data.releaseId,
            runId: data.runId,
            scenarioName: data.test.scenarioName,
            scanId: data.testContextData.scanId,
        };
        await this.testRunner.run(functionalTestGroup, testRunMetadata);
    }

    protected validateRequest(...args: any[]): boolean {
        return true;
    }
}
