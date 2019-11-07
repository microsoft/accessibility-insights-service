// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AuthenticationContext, TokenResponse } from 'adal-node';
import { isEmpty } from 'lodash';
import { RequestPromiseOptions } from 'request-promise';

export interface A11yServiceCredential {
    clientId: string;
    clientSecret: string;
}

export class A11yServiceAuthenticationHandler {
    constructor(
        private readonly credential: A11yServiceCredential,
        private readonly authenticationContext: AuthenticationContext,
        private readonly resource: string,
    ) {}

    public async getToken(): Promise<TokenResponse> {
        return new Promise((resolve, reject) => {
            this.authenticationContext.acquireTokenWithClientCredentials(
                this.resource,
                this.credential.clientId,
                this.credential.clientSecret,
                (err, tokenResponse) => {
                    if (!isEmpty(err)) {
                        reject(err);
                    } else {
                        resolve(tokenResponse as TokenResponse);
                    }
                },
            );
        });
    }

    public async getAuthHeaders(): Promise<RequestPromiseOptions> {
        const accessToken = await this.getToken();

        return {
            headers: {
                authorization: `${accessToken.tokenType} ${accessToken.accessToken}`,
            },
        };
    }
}
