// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';
import { Url } from 'common';

export declare type LoginPageType = 'MicrosoftAzure';

export const loginPageDomain = {
    MicrosoftAzure: 'login.microsoftonline.com',
};

@injectable()
export class LoginPageDetector {
    public getLoginPageType(page: Puppeteer.Page): LoginPageType {
        const url = Url.tryParseUrlString(page.url());
        if (url === undefined) {
            return undefined;
        }

        switch (url.hostname) {
            case loginPageDomain.MicrosoftAzure:
                return 'MicrosoftAzure';
            default:
                return undefined;
        }
    }
}
