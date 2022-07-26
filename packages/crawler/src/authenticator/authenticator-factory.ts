// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { Authenticator } from './authenticator';
import { AzureActiveDirectoryAuthentication } from './azure-active-directory-authenticator';

@injectable()
export class AuthenticatorFactory {
    public createAuthenticator(accountName: string, accountPassword: string, authType: string): Authenticator {
        switch (authType) {
            case 'AAD':
                return new Authenticator(new AzureActiveDirectoryAuthentication(accountName, accountPassword));
            default:
                throw new Error(`Unknown auth type: ${authType}, please provide a valid authType input.`);
        }
    }
}
