// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as requestPromise from 'request-promise';
import { IMock, Mock, Times } from 'typemoq';
import { ApplicationInsightsClient } from './application-insights-client';
import { EventsQueryOptions } from './events-query-options';

// tslint:disable: no-any no-unsafe-any no-null-keyword no-empty

describe(ApplicationInsightsClient, () => {
    let testSubject: ApplicationInsightsClient;
    const appId = 'appId';
    const apiKey = 'apiKey';
    let baseUrl: string;
    let requestStub: any;
    let getMock: IMock<(url: string, options?: requestPromise.RequestPromiseOptions) => {}>;
    let postMock: IMock<(url: string, options?: requestPromise.RequestPromiseOptions) => {}>;

    beforeEach(() => {
        baseUrl = `https://api.applicationinsights.io/v1/apps/${appId}`;
        getMock = Mock.ofInstance(() => {
            return undefined;
        });
        postMock = Mock.ofInstance(() => {
            return undefined;
        });
        requestStub = {
            defaults: (options: requestPromise.RequestPromiseOptions) => requestStub,
            get: getMock.object,
            post: postMock.object,
        };
        testSubject = new ApplicationInsightsClient(appId, apiKey, requestStub);
    });

    afterEach(() => {
        getMock.verifyAll();
        postMock.verifyAll();
    });

    it('verify default options', () => {
        const defaultsMock = Mock.ofInstance((options: requestPromise.RequestPromiseOptions): any => {});
        requestStub.defaults = defaultsMock.object;

        defaultsMock
            .setup(d =>
                d({
                    forever: true,
                    resolveWithFullResponse: true,
                    json: true,
                    headers: {
                        'X-Api-Key': apiKey,
                    },
                }),
            )
            .returns(() => 'some object' as any)
            .verifiable(Times.once());

        testSubject = new ApplicationInsightsClient(appId, apiKey, requestStub);

        defaultsMock.verifyAll();
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
            body: requestBody,
            simple: false,
            json: true,
        };
        let requestUrl: string;

        beforeEach(() => {
            requestUrl = `${baseUrl}/query`;
        });

        it('executeQuery', async () => {
            options.simple = testSubject.throwOnRequestFailure;

            postMock
                .setup(req => req(requestUrl, options))
                .returns(async () => Promise.resolve(response))
                .verifiable(Times.once());

            const actualResponse = await testSubject.executeQuery(query, timespan);

            expect(actualResponse).toEqual(response);
        });

        test.each([true, false])('executeQuery when throwOnFailure is %o', async (throwOnFailure: boolean) => {
            testSubject.throwOnRequestFailure = throwOnFailure;
            options.simple = throwOnFailure;

            postMock
                .setup(req => req(requestUrl, options))
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
                qs: undefined as EventsQueryOptions,
                simple: testSubject.throwOnRequestFailure,
                json: true,
            };
            getMock
                .setup(req => req(eventsUrl, options))
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
                qs: eventsQueryOptions,
                simple: testSubject.throwOnRequestFailure,
                json: true,
            };

            getMock
                .setup(req => req(eventsUrl, options))
                .returns(async () => Promise.resolve(response))
                .verifiable(Times.once());

            const actualResponse = await testSubject.queryEvents(eventType, eventsQueryOptions);

            expect(actualResponse).toEqual(response);
        });

        test.each([true, false])('queryEvents when throwOnFailure is %o', async (throwOnFailure: boolean) => {
            testSubject.throwOnRequestFailure = throwOnFailure;
            const options = {
                qs: undefined as EventsQueryOptions,
                simple: throwOnFailure,
                json: true,
            };

            getMock
                .setup(req => req(eventsUrl, options))
                .returns(async () => Promise.resolve(response))
                .verifiable(Times.once());

            const actualResponse = await testSubject.queryEvents(eventType);

            expect(actualResponse).toEqual(response);
        });
    });
});
