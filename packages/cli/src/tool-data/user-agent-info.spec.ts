// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import Puppeteer from 'puppeteer';
import { UserAgentInfo } from './user-agent-info';

const USER_AGENT = 'user agent';

class PuppeteerBrowserMock {
    public async close(): Promise<void> {
        return Promise.resolve();
    }

    public async userAgent(): Promise<string> {
        return Promise.resolve(USER_AGENT);
    }
}

describe(UserAgentInfo, () => {
    const puppeteer = {
        // tslint:disable-next-line: promise-function-async
        launch: async (options?: Puppeteer.LaunchOptions): Promise<Puppeteer.Browser> =>
            Promise.resolve(<Puppeteer.Browser>(<unknown>new PuppeteerBrowserMock())),
    };
    // tslint:disable-next-line: mocha-no-side-effect-code no-any
    const userAgentInfo = new UserAgentInfo(puppeteer as any);

    it('has a default', () => {
        expect(userAgentInfo).not.toBe(undefined);
    });

    it('returns correct version', async () => {
        const expected = await userAgentInfo.getInfo();
        expect(expected).toEqual(USER_AGENT);
    });
});
