// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock } from 'typemoq';
import { AccessToken } from '@azure/identity';
import { IdentityCredentialProvider } from './identity-credential-provider';
import { IdentityCredentialCache } from './identity-credential-cache';

const scopes = 'https://vault.azure.net/default';
const clientId = 'clientId';

let accessToken: AccessToken;
let identityCredentialCacheMock: IMock<IdentityCredentialCache>;
let identityCredentialProvider: IdentityCredentialProvider;

jest.mock('@azure/identity', () => {
    return {
        ['ManagedIdentityCredential']: class ManagedIdentityCredentialStub {
            public async getToken(): Promise<AccessToken> {
                return accessToken;
            }
        },
    };
});

describe(IdentityCredentialProvider, () => {
    beforeEach(() => {
        accessToken = { token: 'token', expiresOnTimestamp: 12 };
        identityCredentialCacheMock = Mock.ofType<IdentityCredentialCache>();
        identityCredentialProvider = new IdentityCredentialProvider(identityCredentialCacheMock.object);
    });

    afterEach(() => {
        identityCredentialCacheMock.verifyAll();
    });

    it('get token for client id', async () => {
        let credentialToken: AccessToken;
        identityCredentialCacheMock
            .setup((o) => o.getToken(scopes, clientId, It.isAny()))
            .callback(async (s, c, fn) => {
                credentialToken = fn();
            })
            .returns(() => Promise.resolve(credentialToken))
            .verifiable();
        const token = await identityCredentialProvider.getToken(scopes, { clientId });

        expect(token).toEqual(accessToken);
    });

    it('get token', async () => {
        let credentialToken: AccessToken;
        identityCredentialCacheMock
            .setup((o) => o.getToken(scopes, undefined, It.isAny()))
            .callback(async (s, c, fn) => {
                credentialToken = fn();
            })
            .returns(() => Promise.resolve(credentialToken))
            .verifiable();
        const token = await identityCredentialProvider.getToken(scopes);

        expect(token).toEqual(accessToken);
    });

    it('get token for scope array', async () => {
        let credentialToken: AccessToken;
        identityCredentialCacheMock
            .setup((o) => o.getToken(scopes, clientId, It.isAny()))
            .callback(async (s, c, fn) => {
                credentialToken = fn();
            })
            .returns(() => Promise.resolve(credentialToken))
            .verifiable();
        const token = await identityCredentialProvider.getToken([scopes], { clientId });

        expect(token).toEqual(accessToken);
    });
});
