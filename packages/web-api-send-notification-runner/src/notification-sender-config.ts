// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { loggerTypes } from 'logger';
import { Arguments, Argv } from 'yargs';
import { NotificationSenderMetadata } from './types/notification-sender-metadata';

@injectable()
export class NotificationSenderConfig {
    constructor(@inject(loggerTypes.Argv) private readonly argvObj: Argv) {}

    public getConfig(): NotificationSenderMetadata {
        this.argvObj.demandOption(['id', 'runCompleteNotifyUrl']);

        return this.argvObj.argv as Arguments<NotificationSenderMetadata>;
    }
}
