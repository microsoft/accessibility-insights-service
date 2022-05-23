// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { Authenticator } from './authenticator';
import { AzurePortalAuthentication } from './azure-portal-authenticator';

@injectable()
export class AuthenticatorFactory {
    public createAADAuthenticator(accountName: string, accountPassword: string): Authenticator {
        return new Authenticator(new AzurePortalAuthentication(accountName, accountPassword));
    }
}
