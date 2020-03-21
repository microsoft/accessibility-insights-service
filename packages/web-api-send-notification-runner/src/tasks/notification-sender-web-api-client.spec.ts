// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as requestPromise from 'request-promise';
import { IMock, Mock, Times } from 'typemoq';
import { NotificationSenderMetadata } from '../types/notification-sender-metadata';
import { NotificationSenderWebAPIClient } from './notification-sender-web-api-client';

// tslint:disable: no-any mocha-no-side-effect-code no-object-literal-type-assertion no-unsafe-any no-null-keyword

describe(NotificationSenderWebAPIClient, () => {
    let testSubject: NotificationSenderWebAPIClient;
    let requestStub: any;
    let postMock: IMock<(url: string, options?: requestPromise.RequestPromiseOptions) => {}>;

    const sharedOption = {
        forever: true,
        headers: {
            'Content-Type': 'application/json',
        },
        resolveWithFullResponse: true,
        json: true,
        simple: false,
    };

    beforeEach(() => {
        postMock = Mock.ofInstance(() => {
            return null;
        });
        requestStub = {
            defaults: (options: requestPromise.RequestPromiseOptions) => requestStub,
            post: postMock.object,
        };
        testSubject = new NotificationSenderWebAPIClient(false, requestStub);
    });

    describe('verify default options', () => {
        test.each([true, false])('verifies when throwOnFailure is %o', (throwOnFailure: boolean) => {
            const defaultsMock = Mock.ofInstance((options: requestPromise.RequestPromiseOptions): any => {});
            requestStub.defaults = defaultsMock.object;

            defaultsMock
                .setup(d => d({ ...sharedOption, simple: throwOnFailure }))
                .returns(() => 'some object' as any)
                .verifiable(Times.once());

            testSubject = new NotificationSenderWebAPIClient(throwOnFailure, requestStub);

            defaultsMock.verifyAll();
        });
    });

    describe('postReplyUrl', async () => {
        const replyUrl = 'replyUrl';
        const scanId = 'scanId';
        const scanStatus = 'pass';
        const runStatus = 'completed';

        const notificationSenderConfigData: NotificationSenderMetadata = {
            replyUrl: replyUrl,
            scanId: scanId,
            scanStatus: scanStatus,
            runStatus: runStatus,
        };
        const response = { statusCode: 200 };
        const requestBody = [{ scanId: scanId, runStatus: runStatus, scanStatus: scanStatus }];
        const options = {
            ...sharedOption,
            body: requestBody,
            simple: false,
        };

        postMock
            .setup(req => req(replyUrl, options))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        const actualResponse = await testSubject.postNotificationUrl(notificationSenderConfigData);

        expect(actualResponse).toEqual(response);
        postMock.verifyAll();
    });

    afterEach(() => {});
});
