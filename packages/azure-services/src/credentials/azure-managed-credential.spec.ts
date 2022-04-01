// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Got, CancelableRequest, Response } from 'got';
import NodeCache from 'node-cache';
import { IMock, Mock, Times } from 'typemoq';
import { Mutex } from 'async-mutex';
import { AccessToken } from '@azure/core-auth';
import { System } from 'common';
import { AzureManagedCredential } from './azure-managed-credential';

const resource = 'https://vault.azure.net';
const requestUrlBase = 'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2021-10-01';

describe(AzureManagedCredential, () => {
    let scopes = 'https://vault.azure.net/default';
    let requestUrl = `${requestUrlBase}&resource=${resource}`;
    const getTokenOptions = {
        requestOptions: {
            timeout: 30,
        },
    };
    const httpClientOptions = {
        headers: {
            Metadata: 'true',
        },
    };

    const expires_in = 85496;
    const accessToken = { token: 'eyJ0e_3g', expiresOnTimestamp: 1633500000 };
    const imdsTokenString = `{"access_token":"${accessToken.token}","refresh_token":"","expires_in":${expires_in},"expires_on":${accessToken.expiresOnTimestamp},"not_before":${accessToken.expiresOnTimestamp},"resource":"https://vault.azure.net","token_type":"Bearer"}`;

    let httpClientBaseMock: IMock<Got>;
    let tokenCacheMock: IMock<NodeCache>;
    let azureManagedCredential: AzureManagedCredential;

    beforeEach(() => {
        httpClientBaseMock = Mock.ofType<Got>();
        tokenCacheMock = Mock.ofType<NodeCache>();
        httpClientBaseMock
            .setup((o) => o.extend({ ...httpClientOptions }))
            .returns(() => httpClientBaseMock.object)
            .verifiable();

        azureManagedCredential = new AzureManagedCredential(httpClientBaseMock.object, tokenCacheMock.object, new Mutex());
        azureManagedCredential.backOffOptions = {
            delayFirstAttempt: false,
            numOfAttempts: 2,
            maxDelay: 10,
            startingDelay: 0,
        };
    });

    afterEach(() => {
        httpClientBaseMock.verifyAll();
        tokenCacheMock.verifyAll();
    });

    it('get msi token from a service', async () => {
        tokenCacheMock
            .setup((o) => o.get(requestUrl))
            .returns(() => undefined)
            .verifiable();
        tokenCacheMock
            .setup((o) => o.set(requestUrl, JSON.parse(imdsTokenString), expires_in - 600 * 2))
            .returns(() => true)
            .verifiable();
        const response = { statusCode: 200, body: imdsTokenString } as unknown as CancelableRequest<Response<string>>;
        httpClientBaseMock
            .setup((o) => o.get(requestUrl, { timeout: getTokenOptions.requestOptions.timeout }))
            .returns(() => response)
            .verifiable();

        const actualAccessToken = await azureManagedCredential.getToken(scopes, getTokenOptions);

        expect(actualAccessToken).toEqual(accessToken);
    });

    it('get msi token from a cache', async () => {
        tokenCacheMock
            .setup((o) => o.get(requestUrl))
            .returns(() => JSON.parse(imdsTokenString))
            .verifiable();
        tokenCacheMock
            .setup((o) => o.set(requestUrl, JSON.parse(imdsTokenString), expires_in - 600 * 2))
            .returns(() => true)
            .verifiable(Times.never());
        const response = { body: imdsTokenString } as unknown as CancelableRequest<Response<string>>;
        httpClientBaseMock
            .setup((o) => o.get(requestUrl, { timeout: getTokenOptions.requestOptions.timeout }))
            .returns(() => response)
            .verifiable(Times.never());

        const actualAccessToken = await azureManagedCredential.getToken(scopes, getTokenOptions);

        expect(actualAccessToken).toEqual(accessToken);
    });

    it('failed to get msi token from a service', async () => {
        tokenCacheMock
            .setup((o) => o.get(requestUrl))
            .returns(() => undefined)
            .verifiable();
        tokenCacheMock
            .setup((o) => o.set(requestUrl, JSON.parse(imdsTokenString), expires_in - 600 * 2))
            .returns(() => true)
            .verifiable(Times.never());
        const response = { statusCode: 200 } as unknown as CancelableRequest<Response<string>>;
        httpClientBaseMock
            .setup((o) => o.get(requestUrl, { timeout: getTokenOptions.requestOptions.timeout }))
            .returns(() => response)
            .verifiable(Times.exactly(2));

        await expect(azureManagedCredential.getToken(scopes, getTokenOptions)).rejects.toThrowError(/IMDS has return failed response./);
        expect(azureManagedCredential.lastErrors.length).toEqual(2);
    });

    it('failed to get success response a service', async () => {
        tokenCacheMock
            .setup((o) => o.get(requestUrl))
            .returns(() => undefined)
            .verifiable();
        tokenCacheMock
            .setup((o) => o.set(requestUrl, JSON.parse(imdsTokenString), expires_in - 600 * 2))
            .returns(() => true)
            .verifiable(Times.never());
        const response = { statusCode: 429, body: imdsTokenString } as unknown as CancelableRequest<Response<string>>;

        httpClientBaseMock
            .setup((o) => o.get(requestUrl, { timeout: getTokenOptions.requestOptions.timeout }))
            .returns(() => response)
            .verifiable(Times.exactly(2));

        await expect(azureManagedCredential.getToken(scopes, getTokenOptions)).rejects.toThrowError(/IMDS has return failed response./);
        expect(azureManagedCredential.lastErrors.length).toEqual(2);
    });

    it('synchronize get token async calls', async () => {
        const requestCount = 10;
        const actualRequestSequence: string[] = [];
        const expectedRequestSequence: string[] = [];

        for (let i = 1; i <= requestCount; i++) {
            requestUrl = getRequestUrl(i);

            // skip first request since it should be served from IMDS
            if (i !== 1) {
                expectedRequestSequence.push(requestUrl);
                tokenCacheMock
                    .setup((o) => o.get(requestUrl))
                    .returns(async (url) => {
                        actualRequestSequence.push(url);
                        await System.wait(Math.random() * 100);

                        return JSON.parse(imdsTokenString);
                    })
                    .verifiable();
            }
        }

        // first request is served from IMDS
        requestUrl = getRequestUrl(1);
        tokenCacheMock
            .setup((o) => o.set(requestUrl, JSON.parse(imdsTokenString), expires_in - 600 * 2))
            .returns(() => true)
            .verifiable(Times.once());

        const response = { statusCode: 200, body: imdsTokenString } as unknown as CancelableRequest<Response<string>>;
        httpClientBaseMock
            .setup((o) => o.get(requestUrl, { timeout: getTokenOptions.requestOptions.timeout }))
            .returns(() => response)
            .verifiable(Times.once());

        const calls: Promise<AccessToken>[] = [];
        for (let i = 1; i <= requestCount; i++) {
            scopes = `https://${i}.vault.azure.net/default`;
            calls.push(azureManagedCredential.getToken(scopes, getTokenOptions));
        }

        await Promise.all(calls);

        // the call sequence should match
        for (let i = 0; i < expectedRequestSequence.length; i++) {
            expect(actualRequestSequence[i]).toEqual(expectedRequestSequence[i]);
        }
    });
});

function getRequestUrl(resourceId: number): string {
    const resourceWithId = `https://${resourceId}.vault.azure.net`;

    return `${requestUrlBase}&resource=${resourceWithId}`;
}
