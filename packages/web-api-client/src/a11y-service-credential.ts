// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ExtendOptions, Got } from 'got';
import { IdentityCredentialProvider } from 'azure-services';

export class A11yServiceCredential {
    constructor(
        private readonly scope: string,
        private readonly clientId: string,
        private readonly identityCredentialProvider: IdentityCredentialProvider = new IdentityCredentialProvider(),
    ) {}

    public async signRequest(gotRequest: Got): Promise<Got> {
        const accessToken = await this.identityCredentialProvider.getToken(this.scope, { clientId: this.clientId });
        const authOptions: ExtendOptions = {
            headers: {
                authorization: `Bearer ${accessToken.token}`,
            },
        };

        return gotRequest.extend(authOptions);
    }
}
