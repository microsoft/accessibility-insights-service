// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import http from 'http';
import { isEmpty } from 'lodash';
import { IMock, Mock, Times } from 'typemoq';
import { Agents, ExtendOptions, Options, Response } from 'got';
import { NotificationSenderMetadata } from '../types/notification-sender-metadata';
import { NotificationSenderWebAPIClient } from './notification-sender-web-api-client';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions */

describe(NotificationSenderWebAPIClient, () => {
    let testSubject: NotificationSenderWebAPIClient;
    let gotStub: any;
    // eslint-disable-next-line @typescript-eslint/ban-types
    let postMock: IMock<(url: string, options?: Options) => {}>;

    const agents: Agents = { http: {} as http.Agent };
    const getAgentsStub = () => agents;

    beforeEach(() => {
        postMock = Mock.ofInstance(() => {
            return null;
        });
        gotStub = {
            extend: (options: ExtendOptions) => gotStub,
            post: postMock.object,
        };
        testSubject = new NotificationSenderWebAPIClient(false, gotStub, getAgentsStub);
    });

    describe('verify default options', () => {
        test.each([true, false])('verifies when throwOnFailure is %o', (throwOnFailure: boolean) => {
            // eslint-disable-next-line no-empty,@typescript-eslint/no-empty-function
            const extendsMock = Mock.ofInstance((options: ExtendOptions): any => {});
            gotStub.extend = extendsMock.object;

            const sharedOption = {
                headers: {
                    'Content-Type': 'application/json',
                },
                throwHttpErrors: throwOnFailure,
                agent: agents,
            };

            extendsMock
                .setup((e) => e(sharedOption))
                .returns(() => 'some object' as any)
                .verifiable(Times.once());

            testSubject = new NotificationSenderWebAPIClient(throwOnFailure, gotStub, getAgentsStub);

            extendsMock.verifyAll();
        });
    });

    describe('postReplyUrl', () => {
        test.each(['pass', 'fail', '', undefined])('verifies when scanState is %o', async (scanStatus: any) => {
            const scanNotifyUrl = 'scanNotifyUrl';
            const scanId = 'scanId';
            const runStatus = 'completed';

            const notificationSenderConfigData: NotificationSenderMetadata = {
                scanNotifyUrl: scanNotifyUrl,
                scanId: scanId,
                scanStatus: scanStatus,
                runStatus: runStatus,
            };
            const response = { statusCode: 200 } as Response;
            const requestBody = { scanId: scanId, runStatus: runStatus, scanStatus: isEmpty(scanStatus) ? undefined : scanStatus };
            const options = {
                json: requestBody,
                timeout: 30000,
            };

            postMock
                .setup((req) => req(scanNotifyUrl, options))
                .returns(async () => Promise.resolve(response))
                .verifiable(Times.once());

            const actualResponse = await testSubject.sendNotification(notificationSenderConfigData);

            expect(actualResponse).toEqual(response);
            postMock.verifyAll();
        });
    });
});
