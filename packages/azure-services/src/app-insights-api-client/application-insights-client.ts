// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TokenCredential } from '@azure/identity';
import { injectable } from 'inversify';
import got, { Agents, Got, ExtendOptions, Options } from 'got';
import { getForeverAgents, ResponseWithBodyType } from 'common';
import { EventsQueryOptions } from './events-query-options';
import { ApplicationInsightsEventsResponse } from './events-query-response';
import { ApplicationInsightsQueryResponse } from './query-response';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class ApplicationInsightsClient {
    public throwOnRequestFailure: boolean = false;

    private readonly baseUrl = 'https://api.applicationinsights.io/v1/apps';

    private readonly defaultRequestObject: Got;

    private readonly managedIdentity: TokenCredential;

    private readonly defaultOptions: ExtendOptions = {
        responseType: 'json',
    };

    constructor(
        private readonly appId: string,
        managedIdentity: TokenCredential,
        request: Got = got,
        getAgentsFn: () => Agents = getForeverAgents,
    ) {
        this.managedIdentity = managedIdentity;
        this.defaultRequestObject = request.extend({
            ...this.defaultOptions,
            agent: getAgentsFn(),
        });
    }

    public async executeQuery(query: string, queryTimeRange: string): Promise<ResponseWithBodyType<ApplicationInsightsQueryResponse>> {
        const requestUrl = `${this.baseUrl}/${this.appId}/query`;
        const requestBody = {
            query,
            timespan: queryTimeRange,
        };
        const options: Options = {
            json: requestBody,
            throwHttpErrors: this.throwOnRequestFailure,
        };
        const token = await this.getAccessToken();
        const request = this.defaultRequestObject.extend({
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        return (await request.post(requestUrl, options)) as ResponseWithBodyType<ApplicationInsightsQueryResponse>;
    }

    public async queryEvents(
        eventType: string,
        eventsOptions?: EventsQueryOptions,
    ): Promise<ResponseWithBodyType<ApplicationInsightsEventsResponse>> {
        const requestUrl = `${this.baseUrl}/${this.appId}/events/${eventType}`;
        const options: Options = {
            searchParams: eventsOptions,
            throwHttpErrors: this.throwOnRequestFailure,
        };

        const token = await this.getAccessToken();
        const request = this.defaultRequestObject.extend({
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        return (await request.get(requestUrl, options)) as Promise<ResponseWithBodyType<ApplicationInsightsEventsResponse>>;
    }

    private async getAccessToken(): Promise<string> {
        // Obtain the token for accessing Application Insights API
        const tokenResponse = await this.managedIdentity.getToken('https://api.applicationinsights.io/.default');
        if (!tokenResponse) {
            throw new Error('Failed to obtain access token');
        }

        return tokenResponse.token;
    }
}
