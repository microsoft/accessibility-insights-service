// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';
import yargs, { Arguments, Argv } from 'yargs';
import { NotificationSenderMetadata } from './types/notification-sender-metadata';

@injectable()
export class NotificationSenderConfig {
    constructor(private readonly argvObj: Argv = yargs) {
        // Temporary workaround for yargs v16 changing all env variables to lowercase
        argvObj.alias({
            scanid: 'scanId',
            scannotifyurl: 'scanNotifyUrl',
            runstatus: 'runStatus',
        });
    }

    public getConfig(): NotificationSenderMetadata {
        this.argvObj.env().demandOption(['scanId', 'scanNotifyUrl', 'runStatus']);

        return this.argvObj.argv as Arguments<NotificationSenderMetadata>;
    }
}
