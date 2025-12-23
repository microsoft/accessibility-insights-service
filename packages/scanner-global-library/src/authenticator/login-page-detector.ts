// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { ServiceConfiguration, Url } from 'common';
import { AuthenticationType } from 'storage-documents';
import { isEmpty } from 'lodash';

// Unsupported yet recognized authentication providers are marked as undetermined.
const authProviders = [
    {
        type: 'entraId' as AuthenticationType as AuthenticationType,
        name: 'Microsoft Entra ID (Azure AD)',
        pattern: /login\.microsoftonline\.com/i,
    },
    { type: 'undetermined' as AuthenticationType, name: 'Microsoft Personal Account (MSA)', pattern: /login\.live\.com/i },
    {
        type: 'undetermined' as AuthenticationType,
        name: 'Common Sign-in Pattern',
        pattern: /\.com\/((\w+\/)(\bsignin\b|\bsign-in\b|\blogin\b)|(\bsignin\b|\bsign-in\b|\blogin\b))/i,
    },
    { type: 'undetermined' as AuthenticationType, name: 'Common Sign-in Pattern', pattern: /\.com\/.*(\/)?saml2/i },
    { type: 'undetermined' as AuthenticationType, name: 'Common Sign-in Pattern', pattern: /login\..*\.com/i },
    { type: 'undetermined' as AuthenticationType, name: 'Common Sign-in Pattern', pattern: /\.com\/.*(\/)?[o]?auth[2]?\//i },
    { type: 'undetermined' as AuthenticationType, name: 'Google Sign-in', pattern: /accounts\.google\.com/i },
    { type: 'undetermined' as AuthenticationType, name: 'Okta SSO', pattern: /\.okta\.com/i },
    { type: 'undetermined' as AuthenticationType, name: 'Auth0 SSO', pattern: /\.auth0\.com/i },
    { type: 'undetermined' as AuthenticationType, name: 'Amazon Sign-in', pattern: /amazon\.com\/ap\/signin/i },
    { type: 'undetermined' as AuthenticationType, name: 'Federated SSO (ADFS)', pattern: /sts\..*/i },
    { type: 'undetermined' as AuthenticationType, name: 'Federated SSO (ADFS)', pattern: /adfs\..*/i },
    { type: 'undetermined' as AuthenticationType, name: 'Custom Identity Provider', pattern: /id[p]?\..*/i },
    { type: 'undetermined' as AuthenticationType, name: 'Enterprise SSO', pattern: /sso\..*/i },
    { type: 'undetermined' as AuthenticationType, name: 'SAML Provider', pattern: /auth[n]?\..*/i },
];

@injectable()
export class LoginPageDetector {
    constructor(@inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration) {}

    public async getAuthenticationType(url: string): Promise<AuthenticationType> {
        const urlObj = Url.tryParseUrlString(url);
        if (urlObj === undefined) {
            return undefined;
        }

        // Check if the URL matches the E2E test site URL to use authentication.
        const availabilityTestConfig = await this.serviceConfig.getConfigValue('availabilityTestConfig');
        if (!isEmpty(availabilityTestConfig?.urlToScan)) {
            const configUrlObj = Url.tryParseUrlString(availabilityTestConfig.urlToScan);
            if (configUrlObj !== undefined && urlObj.protocol === configUrlObj.protocol && urlObj.host === configUrlObj.host) {
                return 'bearerToken';
            }
        }

        const authProvider = authProviders.find((provider) => provider.pattern.test(urlObj.href));

        // Handle the exception case when using an MSA account for authentication on a Microsoft website.
        if (authProvider?.type === 'undetermined' && !isEmpty(urlObj.query)) {
            const wreply = Url.getParameterValue('wreply', urlObj.href);
            if (wreply?.includes('microsoft')) {
                authProvider.type = 'entraId';
            }
        }

        return authProvider?.type;
    }
}
