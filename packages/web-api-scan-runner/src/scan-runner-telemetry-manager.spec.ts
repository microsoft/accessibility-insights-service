// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { GlobalLogger, Logger, LoggerEvent, TelemetryMeasurements } from 'logger';
import { IMock, It, Mock, Times } from 'typemoq';
import { GuidGenerator } from 'common';
import { ScanRunnerTelemetryManager } from './scan-runner-telemetry-manager';

class TestableScanRunnerTelemetryManager extends ScanRunnerTelemetryManager {
    public scanSubmitted: number;
    public scanStarted: number;

    public constructor(logger: GlobalLogger, guidGenerator: GuidGenerator, getCurrentTimestamp: () => number = Date.now) {
        super(logger, guidGenerator, getCurrentTimestamp);
    }
}

describe(ScanRunnerTelemetryManager, () => {
    const scanId = 'scan id';
    const scanWaitTimeMilliseconds = 10000;
    const scanExecutionTimeMilliseconds = 15000;
    const scanSubmittedTimestamp = 12345678;
    const scanStartedTimestamp = scanSubmittedTimestamp + scanWaitTimeMilliseconds;
    const scanCompletedTimestamp = scanStartedTimestamp + scanExecutionTimeMilliseconds;

    let loggerMock: IMock<GlobalLogger>;
    let getCurrentDateMock: IMock<() => number>;
    let guidGeneratorMock: IMock<GuidGenerator>;

    let testSubject: TestableScanRunnerTelemetryManager;

    beforeEach(() => {
        loggerMock = Mock.ofType<Logger>();
        getCurrentDateMock = Mock.ofInstance(() => null);
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        guidGeneratorMock.setup((gg) => gg.getGuidTimestamp(scanId)).returns(() => new Date(scanSubmittedTimestamp));

        testSubject = new TestableScanRunnerTelemetryManager(loggerMock.object, guidGeneratorMock.object, getCurrentDateMock.object);
    });

    afterEach(() => {
        loggerMock.verifyAll();
    });

    it('trackScanStarted', () => {
        const scanRunningMeasurements = { runningScanRequests: 1 };
        const scanStartedMeasurements = {
            scanWaitTime: scanWaitTimeMilliseconds / 1000,
            startedScanTasks: 1,
        };
        getCurrentDateMock.setup((g) => g()).returns(() => scanStartedTimestamp);
        setupTrackEvent('ScanRequestRunning', scanRunningMeasurements);
        setupTrackEvent('ScanTaskStarted', scanStartedMeasurements);

        testSubject.trackScanStarted(scanId);

        expect(testSubject.scanStarted).toBe(scanStartedTimestamp);
        expect(testSubject.scanSubmitted).toBe(scanSubmittedTimestamp);
    });

    it('trackBrowserScanFailed', () => {
        setupTrackEvent('BrowserScanFailed', { failedBrowserScans: 1 });

        testSubject.trackBrowserScanFailed();
    });

    it('trackScanTaskFailed', () => {
        setupTrackEvent('ScanRequestFailed', { failedScanRequests: 1 });
        setupTrackEvent('ScanTaskFailed', { failedScanTasks: 1 });

        testSubject.trackScanTaskFailed();
    });

    it('trackScanCompleted', () => {
        getCurrentDateMock.setup((g) => g()).returns(() => scanCompletedTimestamp);
        const scanTaskCompletedMeasurements = {
            scanExecutionTime: scanExecutionTimeMilliseconds / 1000,
            scanTotalTime: (scanExecutionTimeMilliseconds + scanWaitTimeMilliseconds) / 1000,
            completedScanTasks: 1,
        };
        const ScanRequestCompletedMeasurements = { completedScanRequests: 1 };
        setupTrackEvent('ScanTaskCompleted', scanTaskCompletedMeasurements);
        setupTrackEvent('ScanRequestCompleted', ScanRequestCompletedMeasurements);
        testSubject.scanSubmitted = scanSubmittedTimestamp;
        testSubject.scanStarted = scanStartedTimestamp;

        testSubject.trackScanCompleted();
    });

    it('trackScanCompleted does nothing if there is no scan start time set', () => {
        loggerMock.setup((l) => l.trackEvent(It.isAny(), It.isAny(), It.isAny())).verifiable(Times.never());
        testSubject.scanSubmitted = scanSubmittedTimestamp;

        testSubject.trackScanCompleted();
    });

    it('trackScanCompleted does nothing if there is no scan submitted time set', () => {
        loggerMock.setup((l) => l.trackEvent(It.isAny(), It.isAny(), It.isAny())).verifiable(Times.never());
        testSubject.scanStarted = scanStartedTimestamp;

        testSubject.trackScanCompleted();
    });

    function setupTrackEvent(eventName: LoggerEvent, measurements: TelemetryMeasurements[LoggerEvent]): void {
        loggerMock.setup((l) => l.trackEvent(eventName, undefined, measurements)).verifiable();
    }
});
