// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

// eslint-disable-next-line import/no-internal-modules
import { DurableOrchestrationContext, IOrchestrationFunctionContext, ITaskMethods, Task } from 'durable-functions/lib/src/classes';
import { It, Mock, Times } from 'typemoq';
import { IMock } from 'typemoq/Api/IMock';
import { ActivityAction } from '../contracts/activity-actions';
import { ActivityRequestData } from '../controllers/activity-request-data';
import { GeneratorExecutor } from '../test-utilities/generator-executor';
import { OrchestrationLogger } from './orchestration-logger';
import { ActivityActionCaller } from './activity-action-caller';

describe(ActivityActionCaller, () => {
    let loggerMock: IMock<OrchestrationLogger>;
    let context: IOrchestrationFunctionContext;
    let orchestrationContextMock: IMock<DurableOrchestrationContext>;

    let testSubject: ActivityActionCaller;

    beforeEach(() => {
        loggerMock = Mock.ofType<OrchestrationLogger>();
        orchestrationContextMock = Mock.ofType<DurableOrchestrationContext>();
        context = ({
            df: orchestrationContextMock.object,
        } as unknown) as IOrchestrationFunctionContext;

        testSubject = new ActivityActionCaller(context, loggerMock.object);
    });

    afterEach(() => {
        loggerMock.verifyAll();
        orchestrationContextMock.verifyAll();
    });

    it('callActivity', () => {
        const activityName = ActivityAction.getHealthStatus;
        const activityData = {
            test: true,
        };
        const activityResult = 'activity result';
        const activityRequestData: ActivityRequestData = {
            activityName: activityName,
            data: activityData,
        };
        orchestrationContextMock
            .setup((oc) => oc.callActivity(ActivityActionCaller.activityTriggerFuncName, activityRequestData))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .returns(() => activityResult as any)
            .verifiable(Times.once());
        loggerMock.setup((l) => l.logOrchestrationStep(It.isAny())).verifiable(Times.exactly(2));

        const generatorExecutor = new GeneratorExecutor(testSubject.callActivity(activityName, activityData));
        const result = generatorExecutor.runTillEnd();

        expect(result).toEqual(activityResult);
    });

    describe('callActivitiesInParallel', () => {
        let taskMethodsMock: IMock<ITaskMethods>;
        const taskName = 'test task';

        beforeEach(() => {
            taskMethodsMock = Mock.ofType<ITaskMethods>();
            orchestrationContextMock.setup((oc) => oc.Task).returns(() => taskMethodsMock.object);
        });

        afterEach(() => {
            taskMethodsMock.verifyAll();
        });

        it('does nothing if list is undefined', () => {
            orchestrationContextMock.setup((oc) => oc.callActivity(It.isAny(), It.isAny())).verifiable(Times.never());
            taskMethodsMock.setup((t) => t.all(It.isAny())).verifiable(Times.never());

            const generatorExecutor = new GeneratorExecutor(testSubject.callActivitiesInParallel(undefined, taskName));
            generatorExecutor.runTillEnd();
        });

        it('does nothing if list is empty', () => {
            orchestrationContextMock.setup((oc) => oc.callActivity(It.isAny(), It.isAny())).verifiable(Times.never());
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
            } as Task;
            activities.forEach((activityRequestData: ActivityRequestData) => {
                orchestrationContextMock
                    .setup((oc) => oc.callActivity(ActivityActionCaller.activityTriggerFuncName, activityRequestData))
                    .returns(() => task)
                    .verifiable(Times.once());
            });

            let taskList: Task[];
            taskMethodsMock
                .setup((t) => t.all(It.isAny()))
                .callback((tasks: Task[]) => (taskList = tasks))
                .verifiable(Times.once());

            const generatorExecutor = new GeneratorExecutor(testSubject.callActivitiesInParallel(activities, taskName));
            generatorExecutor.runTillEnd();

            expect(taskList.length === 2);
            expect(taskList[0]).toEqual(task);
            expect(taskList[1]).toEqual(task);
        });
    });
});
