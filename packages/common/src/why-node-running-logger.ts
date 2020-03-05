// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { dump } from 'wtfnode';

export class WhyNodeRunningLogger {
    constructor(private readonly globalObj = global) {}

    private static logHandles(): void {
        WhyNodeRunningLogger.logMessage('start logging open handles');
        dump();
        WhyNodeRunningLogger.logMessage('after logging open handles');
    }

    private static logMessage(message: string): void {
        console.log(`[WhyNodeRunningLogger][${new Date().toUTCString()}] ${message}`);
    }

    public log(): void {
        WhyNodeRunningLogger.logHandles();
    }

    public async logAfterSeconds(timeoutInSeconds: number): Promise<void> {
        return new Promise(resolve => {
            this.globalObj.setTimeout(() => {
                WhyNodeRunningLogger.logMessage(`Logging after ${timeoutInSeconds}`);
                WhyNodeRunningLogger.logHandles();

                resolve();
            }, timeoutInSeconds * 1000);
        });
    }
}
