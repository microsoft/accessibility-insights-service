// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ExtendOptions, Got } from 'got';
import { IdentityCredentialProvider } from 'azure-services';
import { isEmpty } from 'lodash';

export class A11yServiceCredential {
    constructor(
        private readonly scope: string,
        private readonly clientId: string,
        private readonly token?: string,
        private readonly identityCredentialProvider: IdentityCredentialProvider = new IdentityCredentialProvider(),
    ) {}

    public async signRequest(gotRequest: Got): Promise<Got> {
        if (isEmpty(this.scope) && isEmpty(this.token)) {
            throw new Error('Credential provider mismatch configuration. Provide either scope or token parameter.');
        }

        let bearerToken;
        if (!isEmpty(this.token)) {
            bearerToken = this.token;
        } else {
            const accessToken = await this.identityCredentialProvider.getToken(this.scope, { clientId: this.clientId });
            bearerToken = accessToken.token;
        }

        const authHeader = this.createAuthHeader(bearerToken);

        return gotRequest.extend(authHeader);
    }

    private createAuthHeader(bearerToken: string): ExtendOptions {
        return {
            headers: {
                authorization: `Bearer ${bearerToken}`,
            },
        };
    }
}
