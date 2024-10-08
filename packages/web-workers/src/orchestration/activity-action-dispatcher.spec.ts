// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { It, Mock, Times } from 'typemoq';
import { IMock } from 'typemoq/Api/IMock';
import { SerializableResponse } from 'common';
import * as df from 'durable-functions';
import { ActivityAction } from '../contracts/activity-actions';
import { ActivityRequestData } from '../controllers/activity-request-data';
import { GeneratorExecutor } from '../test-utilities/generator-executor';
import { HealthMonitorActivity } from '../controllers/health-monitor-activity';
import { OrchestrationLogger } from './orchestration-logger';
import { ActivityActionDispatcher } from './activity-action-dispatcher';
import { OrchestrationTelemetryProperties } from './orchestration-telemetry-properties';

describe(ActivityActionDispatcher, () => {
    let loggerMock: IMock<OrchestrationLogger>;
    let context: df.OrchestrationContext;
    let durableOrchestrationContextMock: IMock<df.DurableOrchestrationContext>;

    const instanceId = 'instance id';
    const currentUtcDateTime = new Date(0, 1, 2, 3);

    let testSubject: ActivityActionDispatcher;

    beforeEach(() => {
        loggerMock = Mock.ofType<OrchestrationLogger>();
        durableOrchestrationContextMock = Mock.ofType<df.DurableOrchestrationContext>();
        durableOrchestrationContextMock.setup((o) => o.instanceId).returns(() => instanceId);
        durableOrchestrationContextMock.setup((o) => o.currentUtcDateTime).returns(() => currentUtcDateTime);
        context = {
            df: durableOrchestrationContextMock.object,
        } as unknown as df.OrchestrationContext;

        testSubject = new ActivityActionDispatcher(context, loggerMock.object);
    });

    afterEach(() => {
        loggerMock.verifyAll();
        durableOrchestrationContextMock.verifyAll();
    });

    it('callActivity', () => {
        const activityName = ActivityAction.getHealthStatus;
        const activityData = {
            test: true,
        };
        const activityResult = 'activity result';
        setupCallActivity(activityName, activityData, activityResult);
        loggerMock.setup((l) => l.logOrchestrationStep(It.isAny())).verifiable(Times.exactly(2));

        const generatorExecutor = new GeneratorExecutor(testSubject.callActivity(activityName, activityData));
        const result = generatorExecutor.runTillEnd();

        expect(result).toEqual(activityResult);
    });

    it.each([true, false])('trackAvailability when success=%s', (success) => {
        const properties: OrchestrationTelemetryProperties = {
            activityName: 'test activity name',
        };
        setupTrackAvailability(success, properties);

        const generatorExecutor = new GeneratorExecutor(testSubject.callTrackAvailability(success, properties));
        generatorExecutor.runTillEnd();
    });

    describe('callWebRequestActivity', () => {
        const activityName = ActivityAction.getHealthStatus;
        const activityData = {
            test: true,
        };

        it.each([200, 299])('with successful status code %s', (statusCode) => {
            const expectedResponse = {
                statusCode: statusCode,
            } as SerializableResponse;

            setupCallActivity(activityName, activityData, expectedResponse);
            setupTrackAvailabilityNeverCalled();

            const generatorExecutor = new GeneratorExecutor(testSubject.callWebRequestActivity(activityName, activityData));
            const actualResponse = generatorExecutor.runTillEnd();

            expect(actualResponse).toEqual(expectedResponse);
        });

        it.each([199, 400])('with unsuccessful status code %s', (statusCode) => {
            const expectedResponse = {
                statusCode: statusCode,
            } as SerializableResponse;
            const trackAvailabilityProperties = {
                requestResponse: JSON.stringify(expectedResponse),
                activityName: activityName,
            };

            setupCallActivity(activityName, activityData, expectedResponse);
            setupTrackAvailability(false, trackAvailabilityProperties);

            const generatorExecutor = new GeneratorExecutor(testSubject.callWebRequestActivity(activityName, activityData));

            expect(() => generatorExecutor.runTillEnd()).toThrow();
        });
    });

    interface TaskOps {
        all(tasks: df.Task[]): df.Task;
        any(tasks: df.Task[]): df.Task;
    }

    describe('callActivitiesInParallel', () => {
        let taskMethodsMock: IMock<TaskOps>;
        const taskName = 'test task';

        beforeEach(() => {
            taskMethodsMock = Mock.ofType<TaskOps>();
            durableOrchestrationContextMock.setup((o) => o.Task).returns(() => taskMethodsMock.object);
        });

        afterEach(() => {
            taskMethodsMock.verifyAll();
        });

        it('does nothing if list is undefined', () => {
            durableOrchestrationContextMock.setup((o) => o.callActivity(It.isAny(), It.isAny())).verifiable(Times.never());
            taskMethodsMock.setup((t) => t.all(It.isAny())).verifiable(Times.never());

            const generatorExecutor = new GeneratorExecutor(testSubject.callActivitiesInParallel(undefined, taskName));
            generatorExecutor.runTillEnd();
        });

        it('does nothing if list is empty', () => {
            durableOrchestrationContextMock.setup((o) => o.callActivity(It.isAny(), It.isAny())).verifiable(Times.never());
            taskMethodsMock.setup((t) => t.all(It.isAny())).verifiable(Times.never());

            const generatorExecutor = new GeneratorExecutor(testSubject.callActivitiesInParallel([], taskName));
            generatorExecutor.runTillEnd();
        });

        it('calls All activities', () => {
            const activities: ActivityRequestData[] = [
                {
                    activityName: ActivityAction.getHealthStatus,
                    data: {
                        test: 'test value 1',
                    },
                },
                {
                    activityName: ActivityAction.getScanReport,
                    data: {
                        test: 'test value 2',
                    },
                },
            ];
            const task = {
                isCompleted: true,
                isFaulted: false,
                action: undefined,
            } as df.Task;
            activities.forEach((activityRequestData: ActivityRequestData) => {
                setupCallActivity(activityRequestData.activityName, activityRequestData.data, task);
            });

            let taskList: df.Task[];
            taskMethodsMock
                .setup((t) => t.all(It.isAny()))
                .callback((tasks: df.Task[]) => (taskList = tasks))
                .verifiable(Times.once());

            const generatorExecutor = new GeneratorExecutor(testSubject.callActivitiesInParallel(activities, taskName));
            generatorExecutor.runTillEnd();

            expect(taskList.length === 2);
            expect(taskList[0]).toEqual(task);
            expect(taskList[1]).toEqual(task);
        });
    });

    function setupCallActivity(activityName: string, data?: unknown, result?: unknown): void {
        const activityRequestData: ActivityRequestData = {
            activityName: activityName,
            data: data,
        };
        durableOrchestrationContextMock
            .setup((o) => o.callActivity(HealthMonitorActivity.activityName, activityRequestData))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .returns(() => result as any)
            .verifiable(Times.once());
    }

    function setupTrackAvailability(success: boolean, properties: OrchestrationTelemetryProperties): void {
        const expectedData = {
            name: 'workerAvailabilityTest',
            telemetry: {
                properties: {
                    instanceId: instanceId,
                    currentUtcDateTime: currentUtcDateTime.toUTCString(),
                    ...properties,
                },
                success: success,
            },
        };

        setupCallActivity(ActivityAction.trackAvailability, expectedData);
    }

    function setupTrackAvailabilityNeverCalled(): void {
        durableOrchestrationContextMock
            .setup((o) =>
                o.callActivity(HealthMonitorActivity.activityName, It.isObjectWith({ activityName: ActivityAction.trackAvailability })),
            )
            .verifiable(Times.never());
    }
});
