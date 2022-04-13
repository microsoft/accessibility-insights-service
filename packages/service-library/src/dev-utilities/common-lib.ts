// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as nodeFetch from 'node-fetch';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types */

export interface OAuthToken {
    access_token: string;
}

export interface OAuthOptions {
    oauthClientId: string;
    oauthResourceId: string;
    oauthClientSecret: string;
}

export async function getOAuthToken(options: OAuthOptions): Promise<string> {
    const url = `https://login.microsoftonline.com/microsoft.onmicrosoft.com/oauth2/token`;
    const httpRequest = createGetTokenHttpRequest(options);
    const httpResponse = await nodeFetch.default(url, httpRequest);
    await ensureHttpResponse(httpResponse);
    const body = await httpResponse.json();

    return (body as OAuthToken).access_token;
}

export async function ensureHttpResponse(response: nodeFetch.Response): Promise<void> {
    if (response.status < 200 || response.status > 299) {
        const body = await response.text();

        throw new Error(body);
    }
}

export function createGetHttpRequest(token: string): nodeFetch.RequestInit {
    const headers: nodeFetch.HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    };

    return {
        method: 'GET',
        headers,
    };
}

export function createPostHttpRequest(bodyObj: any, token: string): nodeFetch.RequestInit {
    const headers: nodeFetch.HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    };
    const body = JSON.stringify(bodyObj);

    return {
        method: 'POST',
        headers,
        body,
    };
}
function createGetTokenHttpRequest(options: OAuthOptions): nodeFetch.RequestInit {
    const headers: nodeFetch.HeadersInit = {
        'Content-Type': 'application/x-www-form-urlencoded',
    };

    const body = `grant_type=client_credentials&client_id=${options.oauthClientId}&resource=${
        options.oauthResourceId
    }&client_secret=${encodeURI(options.oauthClientSecret)}`;

    return {
        method: 'POST',
        headers,
        body,
    };
}
