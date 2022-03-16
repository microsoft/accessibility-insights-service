// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator } from 'common';
import { inject, injectable } from 'inversify';
import { isNil } from 'lodash';
import { GlobalLogger, ReportGeneratorTaskCompletedMeasurements } from 'logger';

@injectable()
export class ReportGeneratorRunnerTelemetryManager {
    protected requestsSubmitted: number;

    protected requestsStarted: number;

    public constructor(
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        private readonly getCurrentTimestamp: () => number = Date.now,
    ) {}

    public trackRequestStarted(scanId: string): void {
        this.requestsStarted = this.getCurrentTimestamp();
        this.requestsSubmitted = this.guidGenerator.getGuidTimestamp(scanId).getTime();
        this.logger.trackEvent('ReportGeneratorRequestRunning', undefined, { runningRequests: 1 });
        this.logger.trackEvent('ReportGeneratorTaskStarted', undefined, {
            waitTime: this.asSeconds(this.requestsStarted - this.requestsSubmitted),
            startedTasks: 1,
        });
    }

    public trackRequestFailed(): void {
        this.logger.trackEvent('ReportGeneratorRequestFailed', undefined, { failedRequests: 1 });
        this.logger.trackEvent('ReportGeneratorTaskFailed', undefined, { failedTasks: 1 });
    }

    public trackRequestCompleted(): void {
        if (isNil(this.requestsStarted) || isNil(this.requestsSubmitted)) {
            return;
        }
        const requestCompletedTimestamp: number = this.getCurrentTimestamp();
        const telemetryMeasurements: ReportGeneratorTaskCompletedMeasurements = {
            executionTime: this.asSeconds(requestCompletedTimestamp - this.requestsStarted),
            totalTime: this.asSeconds(requestCompletedTimestamp - this.requestsSubmitted),
            completedTasks: 1,
        };
        this.logger.trackEvent('ReportGeneratorTaskCompleted', undefined, telemetryMeasurements);
        this.logger.trackEvent('ReportGeneratorRequestCompleted', undefined, { completedRequests: 1 });
    }

    private asSeconds(milliseconds: number): number {
        return milliseconds / 1000;
    }
}
