// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { Url } from 'common';

export declare type LoginPageType = 'MicrosoftAzure';

export const loginPageDomain = {
    MicrosoftAzure: 'login.microsoftonline.com',
    MicrosoftLive: 'login.live.com',
};

@injectable()
export class LoginPageDetector {
    public getLoginPageType(url: string): LoginPageType {
        const urlObj = Url.tryParseUrlString(url);
        if (urlObj === undefined) {
            return undefined;
        }

        switch (urlObj.hostname) {
            case loginPageDomain.MicrosoftAzure:
            case loginPageDomain.MicrosoftLive:
                return 'MicrosoftAzure';
            default:
                return undefined;
        }
    }
}
