// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';

@injectable()
export class AsyncInterval {
    /**
     * Executes the given callback after the given interval time in loop,
     * till the callback returns value other than true
     */
    public setIntervalExecution(callback: () => Promise<boolean>, intervalInMilliSec: number): void {
        setTimeout(async () => {
            try {
                const response = await callback();
                if (response === true) {
                    this.setIntervalExecution(callback, intervalInMilliSec);
                }
            } catch (e) {
                console.log('error occured in interval execution - ', e);
                this.setIntervalExecution(callback, intervalInMilliSec);
            }
        }, intervalInMilliSec);
    }
}
