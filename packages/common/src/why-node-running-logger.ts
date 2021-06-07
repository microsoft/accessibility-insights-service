// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { dump } from 'wtfnode';

export class WhyNodeRunningLogger {
    private static logHandles(): void {
        WhyNodeRunningLogger.logMessage('Start logging node open handles.');
        dump();
        WhyNodeRunningLogger.logMessage('Stop logging node open handles.');
    }

    private static logMessage(message: string): void {
        console.log(`[TraceNodeOpenHandles] [${new Date().toUTCString()}] ${message}`);
    }

    constructor(private readonly globalObj = global) {}

    public log(): void {
        WhyNodeRunningLogger.logHandles();
    }

    public async logAfterSeconds(timeoutInSeconds: number): Promise<void> {
        return new Promise((resolve) => {
            this.globalObj.setTimeout(() => {
                WhyNodeRunningLogger.logMessage(`Logging after ${timeoutInSeconds}`);
                WhyNodeRunningLogger.logHandles();

                resolve();
            }, timeoutInSeconds * 1000);
        });
    }
}
