// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

// eslint-disable-next-line import/no-internal-modules
import { DurableOrchestrationContext, IOrchestrationFunctionContext } from 'durable-functions/lib/src/classes';
import { Mock, Times, IMock, It } from 'typemoq';
import moment from 'moment';
import _ from 'lodash';
import { ScanResultResponse, ScanRunErrorResponse, ScanRunResultResponse, WebApiError } from 'service-library';
import { SerializableResponse } from 'common';
import { GeneratorExecutor } from '../test-utilities/generator-executor';
import { ActivityAction } from '../contracts/activity-actions';
import { generatorStub } from '../test-utilities/generator-function';
import { OrchestrationLogger } from './orchestration-logger';
import { ScanWaitOrchestrator } from './scan-wait-orchestrator';
import { ActivityActionDispatcher } from './activity-action-dispatcher';
import { ScanWaitCondition } from './scan-wait-conditions';

describe(ScanWaitOrchestrator, () => {
    let loggerMock: IMock<OrchestrationLogger>;
    let context: IOrchestrationFunctionContext;
    let orchestrationContextMock: IMock<DurableOrchestrationContext>;
    let activityActionDispatcherMock: IMock<ActivityActionDispatcher>;
    let generatorExecutor: GeneratorExecutor;
    let nextTime1: moment.Moment;
    let nextTime2: moment.Moment;
    let nextTime3: moment.Moment;
    const waitInterval = 10;
    const maxWaitTime = waitInterval * 2 + 1;
    let currentUtcDateTime = new Date(0, 1, 2, 3);
    const activityName = 'Test scan wait';
    const scanId = 'scan id';
    const initialScanStatusResponse = {
        body: {
            scanId: scanId,
            run: {
                state: 'queued',
            },
        },
    } as SerializableResponse<ScanRunResultResponse>;
    const succeededScanStatusResponse = {
        body: {
            scanId: scanId,
            run: {
                state: 'completed',
            },
        },
    } as SerializableResponse<ScanRunResultResponse>;
    const failedScanStatusResponse = {
        body: {
            scanId: scanId,
            run: {
                state: 'failed',
            },
        },
    } as SerializableResponse<ScanRunResultResponse>;
    let currentScanStatusResponse: SerializableResponse<ScanResultResponse>;
    let trackAvailabilityCallback: jest.Mock;
    const isSucceededStub = (scanStatus: ScanRunResultResponse) => scanStatus === succeededScanStatusResponse.body;
    const isFailedStub = (scanStatus: ScanRunResultResponse) => scanStatus === failedScanStatusResponse.body;

    let testSubject: ScanWaitOrchestrator;

    beforeEach(() => {
        loggerMock = Mock.ofType<OrchestrationLogger>();
        orchestrationContextMock = Mock.ofType<DurableOrchestrationContext>();
        orchestrationContextMock.setup((o) => o.currentUtcDateTime).returns(() => currentUtcDateTime);
        context = ({
            df: orchestrationContextMock.object,
        } as unknown) as IOrchestrationFunctionContext;
        activityActionDispatcherMock = Mock.ofType<ActivityActionDispatcher>();
        trackAvailabilityCallback = jest.fn();
        currentScanStatusResponse = initialScanStatusResponse;

        nextTime1 = moment.utc(currentUtcDateTime).add(waitInterval, 'seconds');
        nextTime2 = nextTime1.clone().add(waitInterval, 'seconds');
        nextTime3 = nextTime2.clone().add(waitInterval, 'seconds');
        const waitConditions: ScanWaitCondition = {
            isSucceeded: isSucceededStub,
            isFailed: isFailedStub,
        };

        testSubject = new ScanWaitOrchestrator(context, activityActionDispatcherMock.object, loggerMock.object);

        generatorExecutor = new GeneratorExecutor(testSubject.waitFor(scanId, activityName, maxWaitTime, waitInterval, waitConditions));
    });

    afterEach(() => {
        orchestrationContextMock.verifyAll();
        activityActionDispatcherMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('times out if not completed by max time', async () => {
        setupCreateTimer(nextTime1);
        setupCreateTimer(nextTime2);
        setupCreateTimer(nextTime3);

        setupGetScanStatusCalledTimes(3);
        activityActionDispatcherMock
            .setup((o) =>
                o.callTrackAvailability(false, {
                    activityName: activityName,
                    requestResponse: JSON.stringify(currentScanStatusResponse),
                }),
            )
            .returns(() => generatorStub(trackAvailabilityCallback))
            .verifiable(Times.once());

        expect(() => generatorExecutor.runTillEnd()).toThrowError();

        expect(trackAvailabilityCallback).toHaveBeenCalledTimes(1);
    });

    it('succeeds if success condition met before max time', async () => {
        setupWaitWithStatusChange(succeededScanStatusResponse);
        activityActionDispatcherMock
            .setup((o) => o.callTrackAvailability(It.isAny(), It.isAny()))
            .returns(() => generatorStub(trackAvailabilityCallback))
            .verifiable(Times.never());

        generatorExecutor.runTillEnd();
    });

    it('throws if completed with failure condition met', async () => {
        setupWaitWithStatusChange(failedScanStatusResponse);
        activityActionDispatcherMock
            .setup((o) =>
                o.callTrackAvailability(false, {
                    activityName: activityName,
                    requestResponse: JSON.stringify(failedScanStatusResponse),
                }),
            )
            .returns(() => generatorStub(trackAvailabilityCallback))
            .verifiable(Times.once());

        expect(() => generatorExecutor.runTillEnd()).toThrow();

        expect(trackAvailabilityCallback).toHaveBeenCalled();
    });

    it('throws if the scan failed with an error before max time', async () => {
        const errorScanStatusResponse: SerializableResponse<ScanRunErrorResponse> = {
            body: {
                scanId: scanId,
                error: {} as WebApiError,
            },
        } as SerializableResponse<ScanRunErrorResponse>;

        setupWaitWithStatusChange(errorScanStatusResponse);
        activityActionDispatcherMock
            .setup((o) =>
                o.callTrackAvailability(false, {
                    activityName: ActivityAction.getScanResult,
                    requestResponse: JSON.stringify(errorScanStatusResponse),
                }),
            )
            .returns(() => generatorStub(trackAvailabilityCallback))
            .verifiable(Times.once());

        expect(() => generatorExecutor.runTillEnd()).toThrowError();
    });

    function setupGetScanStatusCalledTimes(times: number): void {
        activityActionDispatcherMock
            .setup((o) => o.callWebRequestActivity(ActivityAction.getScanResult, { scanId }))
            .returns(() => generatorStub(() => null, currentScanStatusResponse))
            .verifiable(Times.exactly(times));
    }

    function setupCreateTimer(fireTime: moment.Moment, callback?: () => void): void {
        orchestrationContextMock
            .setup((oc) => oc.createTimer(fireTime.toDate()))
            .returns(() => {
                currentUtcDateTime = fireTime.toDate();
                if (!_.isNil(callback)) {
                    callback();
                }

                return undefined;
            })
            .verifiable(Times.once());
    }

    function setupCreateTimerNeverCalled(fireTime: moment.Moment): void {
        orchestrationContextMock.setup((oc) => oc.createTimer(fireTime.toDate())).verifiable(Times.never());
    }

    function setupWaitWithStatusChange(updatedScanStatusResponse: SerializableResponse<ScanResultResponse>): void {
        setupCreateTimer(nextTime1);
        setupCreateTimer(nextTime2, () => {
            currentScanStatusResponse = updatedScanStatusResponse;
        });
        setupCreateTimerNeverCalled(nextTime3);

        setupGetScanStatusCalledTimes(2);
    }
});
