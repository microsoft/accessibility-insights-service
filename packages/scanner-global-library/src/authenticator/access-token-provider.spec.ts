// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { AccessToken } from '@azure/identity';
import { AccessTokenProvider } from './access-token-provider';

const scopes = 'https://vault.azure.net/default';
const clientId = 'clientId';

let accessToken: AccessToken;
let accessTokenProvider: AccessTokenProvider;
let getTokenMock: jest.Mock;

jest.mock('@azure/identity', () => {
    return {
        ['ManagedIdentityCredential']: class ManagedIdentityCredentialStub {
            public async getToken(scope: string | string[]): Promise<AccessToken> {
                return getTokenMock(scope);
            }
        },
    };
});

describe(AccessTokenProvider, () => {
    beforeEach(() => {
        accessToken = { token: 'token', expiresOnTimestamp: 12 };
        getTokenMock = jest.fn().mockResolvedValue(accessToken);
        accessTokenProvider = new AccessTokenProvider();
    });

    it('get token for client id', async () => {
        const token = await accessTokenProvider.getToken(scopes, { clientId });

        expect(token).toEqual(accessToken);
        expect(getTokenMock).toHaveBeenCalledWith(scopes);
        expect(getTokenMock).toHaveBeenCalledTimes(1);
    });

    it('get token', async () => {
        const token = await accessTokenProvider.getToken(scopes);

        expect(token).toEqual(accessToken);
        expect(getTokenMock).toHaveBeenCalledWith(scopes);
        expect(getTokenMock).toHaveBeenCalledTimes(1);
    });

    it('get token for scope array', async () => {
        const token = await accessTokenProvider.getToken([scopes], { clientId });

        expect(token).toEqual(accessToken);
        expect(getTokenMock).toHaveBeenCalledWith(scopes);
        expect(getTokenMock).toHaveBeenCalledTimes(1);
    });
});
