// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { GlobalLogger, Logger, LoggerEvent, TelemetryMeasurements } from 'logger';
import { IMock, It, Mock, Times } from 'typemoq';
import { GuidGenerator } from 'common';
import { ReportGeneratorRunnerTelemetryManager } from './report-generator-runner-telemetry-manager';

class TestableReportGeneratorRunnerTelemetryManager extends ReportGeneratorRunnerTelemetryManager {
    public declare requestsSubmitted: number;

    public declare requestsStarted: number;

    public constructor(logger: GlobalLogger, guidGenerator: GuidGenerator, getCurrentTimestamp: () => number = Date.now) {
        super(logger, guidGenerator, getCurrentTimestamp);
    }
}

describe(ReportGeneratorRunnerTelemetryManager, () => {
    const scanId = 'scan id';
    const waitTimeMilliseconds = 10000;
    const executionTimeMilliseconds = 15000;
    const submittedTimestamp = 12345678;
    const startedTimestamp = submittedTimestamp + waitTimeMilliseconds;
    const completedTimestamp = startedTimestamp + executionTimeMilliseconds;

    let loggerMock: IMock<GlobalLogger>;
    let getCurrentDateMock: IMock<() => number>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let testSubject: TestableReportGeneratorRunnerTelemetryManager;

    beforeEach(() => {
        loggerMock = Mock.ofType<Logger>();
        getCurrentDateMock = Mock.ofInstance(() => null);
        guidGeneratorMock = Mock.ofType<GuidGenerator>(GuidGenerator);
        guidGeneratorMock.setup((o) => o.getGuidTimestamp(scanId)).returns(() => new Date(submittedTimestamp));

        testSubject = new TestableReportGeneratorRunnerTelemetryManager(
            loggerMock.object,
            guidGeneratorMock.object,
            getCurrentDateMock.object,
        );
    });

    afterEach(() => {
        loggerMock.verifyAll();
    });

    it('track request started', () => {
        const reportGeneratorRequestRunningMeasurements = { runningRequests: 1 };
        const reportGeneratorTaskStartedMeasurements = {
            waitTime: waitTimeMilliseconds / 1000,
            startedTasks: 1,
        };
        getCurrentDateMock.setup((g) => g()).returns(() => startedTimestamp);
        setupTrackEvent('ReportGeneratorRequestRunning', reportGeneratorRequestRunningMeasurements);
        setupTrackEvent('ReportGeneratorTaskStarted', reportGeneratorTaskStartedMeasurements);

        testSubject.trackRequestStarted(scanId);

        expect(testSubject.requestsStarted).toBe(startedTimestamp);
        expect(testSubject.requestsSubmitted).toBe(submittedTimestamp);
    });

    it('track request failed', () => {
        setupTrackEvent('ReportGeneratorRequestFailed', { failedRequests: 1 });
        setupTrackEvent('ReportGeneratorTaskFailed', { failedTasks: 1 });

        testSubject.trackRequestFailed();
    });

    it('track request completed', () => {
        getCurrentDateMock.setup((o) => o()).returns(() => completedTimestamp);
        const telemetryMeasurements = {
            executionTime: executionTimeMilliseconds / 1000,
            totalTime: (executionTimeMilliseconds + waitTimeMilliseconds) / 1000,
            completedTasks: 1,
        };
        const reportGeneratorRequestCompletedMeasurements = { completedRequests: 1 };
        setupTrackEvent('ReportGeneratorTaskCompleted', telemetryMeasurements);
        setupTrackEvent('ReportGeneratorRequestCompleted', reportGeneratorRequestCompletedMeasurements);
        testSubject.requestsSubmitted = submittedTimestamp;
        testSubject.requestsStarted = startedTimestamp;

        testSubject.trackRequestCompleted();
    });

    it('track request completed is skipped if there is no scan start time set', () => {
        loggerMock.setup((o) => o.trackEvent(It.isAny(), It.isAny(), It.isAny())).verifiable(Times.never());
        testSubject.requestsSubmitted = submittedTimestamp;

        testSubject.trackRequestCompleted();
    });

    it('track request completed is skipped if there is no scan submitted time set', () => {
        loggerMock.setup((o) => o.trackEvent(It.isAny(), It.isAny(), It.isAny())).verifiable(Times.never());
        testSubject.requestsStarted = startedTimestamp;

        testSubject.trackRequestCompleted();
    });

    function setupTrackEvent(eventName: LoggerEvent, measurements: TelemetryMeasurements[LoggerEvent]): void {
        loggerMock.setup((o) => o.trackEvent(eventName, undefined, measurements)).verifiable();
    }
});
