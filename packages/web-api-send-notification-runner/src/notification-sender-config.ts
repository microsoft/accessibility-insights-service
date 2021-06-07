// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import yargs, { Arguments, Argv } from 'yargs';
import { NotificationSenderMetadata } from './types/notification-sender-metadata';

@injectable()
export class NotificationSenderConfig {
    constructor(private readonly argvObj: Argv = yargs) {}

    public getConfig(): NotificationSenderMetadata {
        this.argvObj.env().demandOption(['scanId', 'scanNotifyUrl', 'runStatus']);

        return this.argvObj.argv as Arguments<NotificationSenderMetadata>;
    }
}
