// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator } from 'common';
import { inject, injectable } from 'inversify';
import { isNil } from 'lodash';
import { GlobalLogger, ScanTaskCompletedMeasurements } from 'logger';

@injectable()
export class ScanRunnerTelemetryManager {
    protected scanSubmitted: number;
    protected scanStarted: number;

    public constructor(
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        private readonly getCurrentTimestamp: () => number = Date.now,
    ) {}

    public trackScanStarted(scanId: string): void {
        this.scanStarted = this.getCurrentTimestamp();
        this.scanSubmitted = this.guidGenerator.getGuidTimestamp(scanId).getTime();
        this.logger.trackEvent('ScanRequestRunning', undefined, { runningScanRequests: 1 });
        this.logger.trackEvent('ScanTaskStarted', undefined, {
            scanWaitTime: this.millisToSeconds(this.scanStarted - this.scanSubmitted),
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
            scanExecutionTime: this.millisToSeconds(scanCompletedTimestamp - this.scanStarted),
            scanTotalTime: this.millisToSeconds(scanCompletedTimestamp - this.scanSubmitted),
            completedScanTasks: 1,
        };
        this.logger.trackEvent('ScanTaskCompleted', undefined, telemetryMeasurements);
        this.logger.trackEvent('ScanRequestCompleted', undefined, { completedScanRequests: 1 });
    }

    private millisToSeconds(millis: number): number {
        return millis / 1000;
    }
}
