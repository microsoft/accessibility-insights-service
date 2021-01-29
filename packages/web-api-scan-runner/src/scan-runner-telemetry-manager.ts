// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { isNil } from 'lodash';
import { GlobalLogger, ScanTaskCompletedMeasurements } from 'logger';

@injectable()
export class ScanRunnerTelemetryManager {
    public scanSubmitted: number;
    public scanStarted: number;

    public constructor(
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        private readonly getCurrentTimestamp: () => number = Date.now,
    ) {}

    public trackScanStarted(scanSubmittedTimestamp: Date): void {
        this.scanStarted = this.getCurrentTimestamp();
        this.scanSubmitted = scanSubmittedTimestamp.getTime();
        this.logger.trackEvent('ScanRequestRunning', undefined, { runningScanRequests: 1 });
        this.logger.trackEvent('ScanTaskStarted', undefined, {
            scanWaitTime: (this.scanStarted - this.scanSubmitted) / 1000,
            startedScanTasks: 1,
        });
    }

    public trackBrowserScanFailed(): void {
        this.logger.trackEvent('BrowserScanFailed', undefined, { failedBrowserScans: 1 });
    }

    public trackScanTaskFailed(): void {
        this.logger.trackEvent('ScanRequestFailed', undefined, { failedScanRequests: 1 });
        this.logger.trackEvent('ScanTaskFailed', undefined, { failedScanTasks: 1 });
    }

    public trackScanCompleted(): void {
        if (isNil(this.scanStarted) || isNil(this.scanSubmitted)) {
            return;
        }
        const scanCompletedTimestamp: number = this.getCurrentTimestamp();
        const telemetryMeasurements: ScanTaskCompletedMeasurements = {
            scanExecutionTime: (scanCompletedTimestamp - this.scanStarted) / 1000,
            scanTotalTime: (scanCompletedTimestamp - this.scanSubmitted) / 1000,
            completedScanTasks: 1,
        };
        this.logger.trackEvent('ScanTaskCompleted', undefined, telemetryMeasurements);
        this.logger.trackEvent('ScanRequestCompleted', undefined, { completedScanRequests: 1 });
    }
}
