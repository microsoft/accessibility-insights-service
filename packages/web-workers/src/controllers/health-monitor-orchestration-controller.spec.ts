// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Mock } from 'typemoq';
import { AppContext } from 'service-library';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { orchestrationName } from '../orchestration/orchestration-name';
import { HealthMonitorOrchestrationController } from './health-monitor-orchestration-controller';

let controller: HealthMonitorOrchestrationController;
let appContext: AppContext;

const loggerMock = Mock.ofType(MockableLogger);
const durableClient = {
    startNew: jest.fn().mockImplementation(() => '1'),
};

jest.mock('durable-functions', () => ({
    getClient: () => durableClient,
}));

describe(HealthMonitorOrchestrationController, () => {
    beforeEach(() => {
        appContext = {
            context: {},
        } as AppContext;

        controller = new HealthMonitorOrchestrationController(loggerMock.object);
    });

    it('sets context required for orchestrator execution', async () => {
        await controller.invoke(appContext);
        expect(durableClient.startNew).toHaveBeenCalledWith(orchestrationName);
    });
});
