// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

type PageOperation = 'type' | 'click' | 'enter' | 'waitForNavigation';
type CredentialType = 'name' | 'password';
export type AuthenticationMethod = 'aad' | 'dsts';

export type AuthenticationStep = {
    operation: PageOperation;
    selector?: string;
    credential?: CredentialType;
    value?: string;
};

export interface AuthenticationFlow {
    startingUrl: string;
    authenticatedUrl: string;
    steps: AuthenticationStep[];
}
