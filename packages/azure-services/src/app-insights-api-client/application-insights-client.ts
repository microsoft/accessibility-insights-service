// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import got, { Agents, Got, ExtendOptions, Options } from 'got';
import { getForeverAgents, ResponseWithBodyType } from 'common';
import { TokenCredential } from '@azure/core-auth';
import { EventsQueryOptions } from './events-query-options';
import { ApplicationInsightsEventsResponse } from './events-query-response';
import { ApplicationInsightsQueryResponse } from './query-response';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class ApplicationInsightsClient {
    public throwOnRequestFailure: boolean = false;

    private readonly baseUrl = 'https://api.applicationinsights.io/v1/apps';

    private readonly resource = 'https://api.applicationinsights.io';

    private readonly defaultRequestObject: Got;

    private readonly defaultOptions: ExtendOptions = {
        responseType: 'json',
    };

    constructor(
        private readonly appId: string,
        private readonly azureClientId: string,
        private readonly credential: TokenCredential,
        request: Got = got,
        getAgentsFn: () => Agents = getForeverAgents,
    ) {
        this.defaultRequestObject = request.extend({
            ...this.defaultOptions,
            agent: getAgentsFn(),
        });
    }

    public async executeQuery(query: string, queryTimeRange: string): Promise<ResponseWithBodyType<ApplicationInsightsQueryResponse>> {
        const requestUrl = `${this.baseUrl}/${this.appId}/query`;
        // The clientId is supported by the ManagedIdentityCredential class
        const token = await this.credential.getToken(this.resource, { clientId: this.azureClientId } as any);
        const headers = {
            Authorization: `Bearer ${token.token}`,
        };

        const requestBody = {
            query,
            timespan: queryTimeRange,
        };
        const options: Options = {
            json: requestBody,
            throwHttpErrors: this.throwOnRequestFailure,
            headers,
        };

        return (await this.defaultRequestObject.post(requestUrl, options)) as ResponseWithBodyType<ApplicationInsightsQueryResponse>;
    }

    public async queryEvents(
        eventType: string,
        eventsOptions?: EventsQueryOptions,
    ): Promise<ResponseWithBodyType<ApplicationInsightsEventsResponse>> {
        const requestUrl = `${this.baseUrl}/${this.appId}/events/${eventType}`;
        const token = await this.credential.getToken(this.resource);
        const headers = {
            Authorization: `Bearer ${token.token}`,
        };
        const options: Options = {
            searchParams: eventsOptions,
            throwHttpErrors: this.throwOnRequestFailure,
            headers,
        };

        return (await this.defaultRequestObject.get(requestUrl, options)) as Promise<
            ResponseWithBodyType<ApplicationInsightsEventsResponse>
        >;
    }
}
