// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { getForeverAgents, ResponseWithBodyType } from 'common';
import got, { Agents, Got, Options } from 'got';
import { injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { NotificationSenderMetadata } from '../types/notification-sender-metadata';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class NotificationSenderWebAPIClient {
    private readonly defaultRequestObject: Got;
    private readonly defaultOptions: Options = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    constructor(
        private readonly throwOnRequestFailure: boolean = false,
        requestObject: any = got,
        getAgents: () => Agents = getForeverAgents,
    ) {
        this.defaultRequestObject = requestObject.extend({
            ...this.defaultOptions,
            agent: getAgents(),
            throwHttpErrors: this.throwOnRequestFailure,
        });
    }

    public async sendNotification(notificationSenderConfigData: NotificationSenderMetadata): Promise<ResponseWithBodyType> {
        const requestBody = {
            scanId: notificationSenderConfigData.scanId,
            runStatus: notificationSenderConfigData.runStatus,
            scanStatus: isEmpty(notificationSenderConfigData.scanStatus) ? undefined : notificationSenderConfigData.scanStatus,
        };
        const options: Options = { json: requestBody, timeout: 30000 };

        return (await this.defaultRequestObject.post(notificationSenderConfigData.scanNotifyUrl, options)) as ResponseWithBodyType;
    }
}
