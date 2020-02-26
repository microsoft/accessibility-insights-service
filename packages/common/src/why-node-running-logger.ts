// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { dump } from 'wtfnode';

import { isNil } from 'lodash';

export class WhyNodeRunningLogger {
    private intervalId: NodeJS.Timeout;

    constructor(private readonly intervalInMillSeconds: number = 500, private readonly globalObj = global) {}

    public static LOGNOW(): void {
        WhyNodeRunningLogger.logMessage('Adhoc request');
        WhyNodeRunningLogger.logHandles();
    }

    private static logHandles(): void {
        WhyNodeRunningLogger.logMessage('start logging open handles');
        dump();
        WhyNodeRunningLogger.logMessage('after logging open handles');
    }

    private static logMessage(message: string): void {
        console.log(`[WhyNodeRunningLogger][${new Date().toUTCString()}] ${message}`);
    }

    public start(): void {
        if (isNil(this.intervalId)) {
            this.intervalId = this.globalObj.setInterval(() => {
                WhyNodeRunningLogger.logMessage('Start interval callback');
                WhyNodeRunningLogger.logHandles();
            }, this.intervalInMillSeconds);
        }
    }

    public stop(): void {
        if (!isNil(this.intervalId)) {
            WhyNodeRunningLogger.logMessage('Stopped interval callback');
            this.globalObj.clearInterval(this.intervalId);
            WhyNodeRunningLogger.logHandles();
            this.intervalId = undefined;
        }
    }

    public stopAfterSeconds(timeoutInSeconds: number): void {
        this.globalObj.setTimeout(() => {
            this.stop();
        }, timeoutInSeconds * 1000);
    }
}
