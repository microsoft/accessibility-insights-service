// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { AuthenticationFlow } from './authentication-flow';
import { Authenticator } from './authenticator';
import { AzurePortalAuthenticatonFlow } from './azure-portal-authenticator';

@injectable()
export class AuthenticatorFactory {
    public constructor() {}

    protected injectCredentialsIntoAuthFlow(
        authenticationFlow: AuthenticationFlow,
        accountName: string,
        accountPassword: string,
    ): AuthenticationFlow {
        let finalSteps = [...authenticationFlow.steps];
        const accountNameStepIndex = authenticationFlow.steps.findIndex((step) => step.credential === 'name');
        const accountPasswordStepIndex = authenticationFlow.steps.findIndex((step) => step.credential === 'password');
        if (accountNameStepIndex < 0 || accountPasswordStepIndex < 0) {
            throw new Error('Authentication steps must include "credentials" steps for both accountName and accountPassword');
        }
        finalSteps[accountNameStepIndex].value = accountName;
        finalSteps[accountPasswordStepIndex].value = accountPassword;
        authenticationFlow.steps = finalSteps;
        return authenticationFlow;
    }

    public createAADAuthenticator(accountName: string, accountPassword: string) {
        const authenticationFlow = this.injectCredentialsIntoAuthFlow(AzurePortalAuthenticatonFlow, accountName, accountPassword);
        return new Authenticator(authenticationFlow);
    }
}
