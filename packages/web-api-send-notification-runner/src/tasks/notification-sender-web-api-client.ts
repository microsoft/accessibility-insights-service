// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';
import { ResponseAsJSON } from 'request';
import * as requestPromise from 'request-promise';
import { NotificationSenderMetadata } from '../types/notification-sender-metadata';

// tslint:disable: no-null-keyword no-any
export interface ResponseWithBodyType<T = {}> extends ResponseAsJSON {
    body: T;
}

@injectable()
export class NotificationSenderWebAPIClient {
    private readonly defaultRequestObject: typeof requestPromise;
    private readonly defaultOptions: requestPromise.RequestPromiseOptions = {
        forever: true,
        headers: {
            'Content-Type': 'application/json',
        },
        resolveWithFullResponse: true,
        json: true,
    };

    constructor(
        private readonly throwOnRequestFailure: boolean = false,
        httpRequest: any = requestPromise,
    ) {
        this.defaultRequestObject = httpRequest.defaults({
            ...this.defaultOptions,
            simple: this.throwOnRequestFailure,
        });
    }

    public async postNotificationUrl(notificationSenderConfigData: NotificationSenderMetadata): Promise<ResponseAsJSON> {
        const requestBody = {
            scanId: notificationSenderConfigData.scanId,
            runState: notificationSenderConfigData.runStatus,
            scanStatus: notificationSenderConfigData.scanStatus,
        };
        const options: requestPromise.RequestPromiseOptions = { body: requestBody };

        return this.defaultRequestObject.post(notificationSenderConfigData.replyUrl, options);
    }
}
