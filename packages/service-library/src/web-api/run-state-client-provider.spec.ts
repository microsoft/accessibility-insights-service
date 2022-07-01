// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import { ServiceConfiguration, ScanRunTimeConfig, TaskRuntimeConfig } from 'common';
import { OnDemandPageScanRunState, OnDemandPageScanResult } from 'storage-documents';
import moment from 'moment';
import { RunStateClientProvider } from './run-state-client-provider';

let runStateClientProvider: RunStateClientProvider;
let serviceConfigurationMock: IMock<ServiceConfiguration>;

const scanRunTimeConfig = { maxFailedScanRetryCount: 2 } as ScanRunTimeConfig;
const taskRuntimeConfig = { taskTimeoutInMinutes: 10 } as TaskRuntimeConfig;

describe(RunStateClientProvider, () => {
    beforeEach(() => {
        serviceConfigurationMock = Mock.ofType<ServiceConfiguration>();
        runStateClientProvider = new RunStateClientProvider(serviceConfigurationMock.object);
    });

    afterEach(() => {
        serviceConfigurationMock.verifyAll();
    });

    test.each(['pending', 'accepted', 'queued', 'report', 'completed'])(
        `should bypass state conversion for %o db state`,
        async (dbState: OnDemandPageScanRunState) => {
            const pageScanResult = {
                run: {
                    state: dbState,
                },
            } as OnDemandPageScanResult;
            const actualState = await runStateClientProvider.getEffectiveRunState(pageScanResult);
            expect(actualState).toEqual(dbState);
        },
    );

    test.each(['failed'])(
        `should return 'failed' state for %o db state when no retry attempt left`,
        async (dbState: OnDemandPageScanRunState) => {
            serviceConfigurationMock
                .setup((o) => o.getConfigValue('scanConfig'))
                .returns(() => Promise.resolve(scanRunTimeConfig))
                .verifiable();
            const pageScanResult = {
                run: {
                    retryCount: 2,
                    state: dbState,
                },
            } as OnDemandPageScanResult;
            const actualState = await runStateClientProvider.getEffectiveRunState(pageScanResult);
            expect(actualState).toEqual('failed');
        },
    );

    test.each(['failed'])(
        `should return 'retrying' state for %o db state when retry available`,
        async (dbState: OnDemandPageScanRunState) => {
            serviceConfigurationMock
                .setup((o) => o.getConfigValue('scanConfig'))
                .returns(() => Promise.resolve(scanRunTimeConfig))
                .verifiable();
            serviceConfigurationMock
                .setup((o) => o.getConfigValue('taskConfig'))
                .returns(() => Promise.resolve(taskRuntimeConfig))
                .verifiable();
            const pageScanResult = {
                run: {
                    retryCount: 2,
                    state: dbState,
                },
            } as OnDemandPageScanResult;
            const actualState = await runStateClientProvider.getEffectiveRunState(pageScanResult);
            expect(actualState).toEqual('failed');
        },
    );

    test.each(['running'])(
        `should bypass state conversion for %o db state when scan is still running`,
        async (dbState: OnDemandPageScanRunState) => {
            serviceConfigurationMock
                .setup((o) => o.getConfigValue('taskConfig'))
                .returns(() => Promise.resolve(taskRuntimeConfig))
                .verifiable();
            const pageScanResult = {
                run: {
                    timestamp: moment().toJSON(),
                    state: dbState,
                },
            } as OnDemandPageScanResult;
            const actualState = await runStateClientProvider.getEffectiveRunState(pageScanResult);
            expect(actualState).toEqual(dbState);
        },
    );

    test.each(['running'])(
        `should return 'retrying' state for %o db state when scan is not running and retry available`,
        async (dbState: OnDemandPageScanRunState) => {
            serviceConfigurationMock
                .setup((o) => o.getConfigValue('scanConfig'))
                .returns(() => Promise.resolve(scanRunTimeConfig))
                .verifiable();
            serviceConfigurationMock
                .setup((o) => o.getConfigValue('taskConfig'))
                .returns(() => Promise.resolve(taskRuntimeConfig))
                .verifiable();
            const pageScanResult = {
                run: {
                    timestamp: moment().add(-taskRuntimeConfig.taskTimeoutInMinutes, 'minutes').toJSON(),
                    state: dbState,
                },
            } as OnDemandPageScanResult;
            const actualState = await runStateClientProvider.getEffectiveRunState(pageScanResult);
            expect(actualState).toEqual('retrying');
        },
    );
});
