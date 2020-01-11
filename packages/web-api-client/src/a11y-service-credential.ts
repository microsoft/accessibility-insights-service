// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AuthenticationContext, TokenResponse } from 'adal-node';
import * as requestPromise from 'request-promise';
import { isNullOrUndefined } from 'util';

export class A11yServiceCredential {
    private readonly authContext: AuthenticationContext;

    constructor(
        private readonly clientId: string,
        private readonly clientSecret: string,
        private readonly resourceId: string,
        authorityUrl: string,
        context?: AuthenticationContext,
    ) {
        // tslint:disable-next-line: no-any no-unsafe-any strict-boolean-expressions
        this.authContext = context || new (<any>AuthenticationContext)(authorityUrl, undefined, undefined, '');
    }

    public async getToken(): Promise<TokenResponse> {
        return new Promise((resolve, reject) => {
            this.authContext.acquireTokenWithClientCredentials(this.resourceId, this.clientId, this.clientSecret, (err, tokenResponse) => {
                if (!isNullOrUndefined(err)) {
                    reject(err);
                } else {
                    resolve(tokenResponse as TokenResponse);
                }
            });
        });
    }

    public async signRequest(request: typeof requestPromise): Promise<typeof requestPromise> {
        const accessToken = await this.getToken();
        const authOptions: requestPromise.RequestPromiseOptions = {
            headers: {
                authorization: `${accessToken.tokenType} ${accessToken.accessToken}`,
            },
        };

        return request.defaults(authOptions);
    }
}
