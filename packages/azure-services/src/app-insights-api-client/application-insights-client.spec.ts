// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import http from 'http';
import { IMock, Mock, Times } from 'typemoq';
import { Agents, ExtendOptions, Options } from 'got';
import { ApplicationInsightsClient } from './application-insights-client';
import { EventsQueryOptions } from './events-query-options';

/* eslint-disable @typescript-eslint/no-explicit-any,
   no-empty,
   @typescript-eslint/no-empty-function,
   @typescript-eslint/ban-types */

describe(ApplicationInsightsClient, () => {
    let testSubject: ApplicationInsightsClient;
    const appId = 'appId';
    const apiKey = 'apiKey';
    let baseUrl: string;
    let requestStub: any;
    let getMock: IMock<(url: string, options?: Options) => {}>;
    let postMock: IMock<(url: string, options?: Options) => {}>;
    const agents: Agents = { http: {} as http.Agent };
    const getAgentsStub = () => agents;

    beforeEach(() => {
        baseUrl = `https://api.applicationinsights.io/v1/apps/${appId}`;
        getMock = Mock.ofInstance(() => {
            return undefined;
        });
        postMock = Mock.ofInstance(() => {
            return undefined;
        });
        requestStub = {
            extend: (options: ExtendOptions) => requestStub,
            get: getMock.object,
            post: postMock.object,
        };
        testSubject = new ApplicationInsightsClient(appId, apiKey, requestStub, getAgentsStub);
    });

    afterEach(() => {
        getMock.verifyAll();
        postMock.verifyAll();
    });

    it('verify default options', () => {
        const extendsMock = Mock.ofInstance((options: ExtendOptions): any => {});
        requestStub.extend = extendsMock.object;

        extendsMock
            .setup((d) =>
                d({
                    headers: {
                        'X-Api-Key': apiKey,
                    },
                    responseType: 'json',
                    agent: agents,
                }),
            )
            .returns(() => 'some object' as any)
            .verifiable(Times.once());

        testSubject = new ApplicationInsightsClient(appId, apiKey, requestStub, getAgentsStub);

        extendsMock.verifyAll();
    });

    describe('executeQuery', () => {
        const query = 'query string';
        const timespan = 'timespan';

        const response = { statusCode: 200 };
        const requestBody = {
            query,
            timespan,
        };
        const options = {
            json: requestBody,
            throwHttpErrors: false,
        };
        let requestUrl: string;

        beforeEach(() => {
            requestUrl = `${baseUrl}/query`;
        });

        it('executeQuery', async () => {
            options.throwHttpErrors = testSubject.throwOnRequestFailure;

            postMock
                .setup((req) => req(requestUrl, options))
                .returns(async () => Promise.resolve(response))
                .verifiable(Times.once());

            const actualResponse = await testSubject.executeQuery(query, timespan);

            expect(actualResponse).toEqual(response);
        });

        test.each([true, false])('executeQuery when throwOnFailure is %o', async (throwOnFailure: boolean) => {
            testSubject.throwOnRequestFailure = throwOnFailure;
            options.throwHttpErrors = throwOnFailure;

            postMock
                .setup((req) => req(requestUrl, options))
                .returns(async () => Promise.resolve(response))
                .verifiable(Times.once());

            const actualResponse = await testSubject.executeQuery(query, timespan);

            expect(actualResponse).toEqual(response);
        });
    });

    describe('queryEvents', () => {
        const eventType = 'event type';
        const response = { statusCode: 200 };
        let eventsUrl: string;

        beforeEach(() => {
            eventsUrl = `${baseUrl}/events/${eventType}`;
        });

        it('queryEvents without query parameters', async () => {
            const options = {
                searchParams: undefined as EventsQueryOptions,
                throwHttpErrors: testSubject.throwOnRequestFailure,
            };
            getMock
                .setup((req) => req(eventsUrl, options))
                .returns(async () => Promise.resolve(response))
                .verifiable(Times.once());

            const actualResponse = await testSubject.queryEvents(eventType);

            expect(actualResponse).toEqual(response);
        });

        it('queryEvents with query parameters', async () => {
            const eventsQueryOptions: EventsQueryOptions = {
                timespan: 'timespan',
                $filter: 'filter',
            };
            const options = {
                searchParams: eventsQueryOptions,
                throwHttpErrors: testSubject.throwOnRequestFailure,
            };

            getMock
                .setup((req) => req(eventsUrl, options))
                .returns(async () => Promise.resolve(response))
                .verifiable(Times.once());

            const actualResponse = await testSubject.queryEvents(eventType, eventsQueryOptions);

            expect(actualResponse).toEqual(response);
        });

        test.each([true, false])('queryEvents when throwOnFailure is %o', async (throwOnFailure: boolean) => {
            testSubject.throwOnRequestFailure = throwOnFailure;
            const options = {
                searchParams: undefined as EventsQueryOptions,
                throwHttpErrors: throwOnFailure,
            };

            getMock
                .setup((req) => req(eventsUrl, options))
                .returns(async () => Promise.resolve(response))
                .verifiable(Times.once());

            const actualResponse = await testSubject.queryEvents(eventType);

            expect(actualResponse).toEqual(response);
        });
    });
});
