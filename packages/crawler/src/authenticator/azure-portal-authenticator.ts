// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AuthenticationFlow } from './authentication-flow';
export const AzurePortalAuthenticatonFlow: AuthenticationFlow = {
    startingUrl: 'https://portal.azure.com',
    authenticatedUrl: 'https://ms.portal.azure.com',
    steps: [
        {
            operation: 'type',
            selector: 'input[name="loginfmt"]',
            credential: 'name',
        },
        {
            operation: 'enter',
        },
        {
            operation: 'click',
            selector: '#FormsAuthentication',
        },
        {
            operation: 'type',
            selector: 'input[type="password"]',
            credential: 'password',
        },
        {
            operation: 'enter',
        },
        {
            operation: 'waitForNavigation',
        },
    ],
};
