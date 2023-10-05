// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { Url } from 'common';
import { AuthenticationType } from 'storage-documents';

const entraLoginDomains = ['login.microsoftonline.com', 'login.live.com'];
const urlLoginHints = ['auth', 'onmicrosoft', 'sso', 'signin', 'login', 'openid', 'token'];

@injectable()
export class LoginPageDetector {
    public getAuthenticationType(url: string): AuthenticationType {
        const urlObj = Url.tryParseUrlString(url);
        if (urlObj === undefined) {
            return undefined;
        }

        let authType = this.detectLoginDomain(urlObj.hostname);
        if (authType !== undefined) {
            return authType;
        }

        authType = this.detectLoginHint(urlObj.href);

        return authType;
    }

    private detectLoginDomain(hostname: string): AuthenticationType {
        if (entraLoginDomains.includes(hostname.toLowerCase())) {
            return 'entraId';
        }

        return undefined;
    }

    private detectLoginHint(url: string): AuthenticationType {
        const decodedURI = decodeURI(url);
        const hints = urlLoginHints.find((hint) => decodedURI.includes(hint));
        if (hints !== undefined) {
            return 'undetermined';
        }

        return undefined;
    }
}
