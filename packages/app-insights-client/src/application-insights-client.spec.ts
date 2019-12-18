// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as request from 'request-promise';
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
    let getMock: IMock<(url: string, options?: request.RequestPromiseOptions) => {}>;
    let postMock: IMock<(url: string, options?: request.RequestPromiseOptions) => {}>;

    beforeEach(() => {
        baseUrl = `https://api.applicationinsights.io/v1/apps/${appId}`;
        getMock = Mock.ofInstance(() => {
            return undefined;
        });
        postMock = Mock.ofInstance(() => {
            return undefined;
        });
        requestStub = {
            defaults: (options: request.RequestPromiseOptions) => requestStub,
            get: getMock.object,
            post: postMock.object,
        };
        testSubject = new ApplicationInsightsClient(appId, apiKey, false, requestStub);
    });

    afterEach(() => {
        getMock.verifyAll();
        postMock.verifyAll();
    });

    describe('verify default options', () => {
        test.each([true, false])('verifies when throwOnFailure is %o', (throwOnFailure: boolean) => {
            const defaultsMock = Mock.ofInstance((options: request.RequestPromiseOptions): any => {});
            requestStub.defaults = defaultsMock.object;

            defaultsMock
                .setup(d =>
                    d({
                        forever: true,
                        resolveWithFullResponse: true,
                        json: true,
                        simple: throwOnFailure,
                        headers: {
                            'X-Api-Key': apiKey,
                        },
                    }),
                )
                .returns(() => 'some object' as any)
                .verifiable(Times.once());

            testSubject = new ApplicationInsightsClient(appId, apiKey, throwOnFailure, requestStub);

            defaultsMock.verifyAll();
        });
    });

    it('query', async () => {
        const query = 'query string';
        const timespan = 'timespan';

        const response = { statusCode: 200 };
        const requestBody = {
            query,
            timespan,
        };
        const options = { body: requestBody };
        postMock
            .setup(req => req(`${baseUrl}/query`, options))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        const actualResponse = await testSubject.query(query, timespan);

        expect(actualResponse).toEqual(response);
    });

    describe('events', () => {
        const eventType = 'event type';
        const response = { statusCode: 200 };
        let eventsUrl: string;

        beforeEach(() => {
            eventsUrl = `${baseUrl}/events/${eventType}`;
        });

        it('without query parameters', async () => {
            const options = { qs: undefined as EventsQueryOptions };
            getMock
                .setup(req => req(eventsUrl, options))
                .returns(async () => Promise.resolve(response))
                .verifiable(Times.once());

            const actualResponse = await testSubject.events(eventType);

            expect(actualResponse).toEqual(response);
        });

        it('with query parameters', async () => {
            const eventsQueryOptions: EventsQueryOptions = {
                timespan: 'timespan',
                $filter: 'filter',
            };
            const options = { qs: eventsQueryOptions };

            getMock
                .setup(req => req(eventsUrl, options))
                .returns(async () => Promise.resolve(response))
                .verifiable(Times.once());

            const actualResponse = await testSubject.events(eventType, eventsQueryOptions);

            expect(actualResponse).toEqual(response);
        });
    });
});
