// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import Apify from 'apify';
const { log: apifyLog } = Apify.utils;
import Puppeteer from 'puppeteer';

import { IMock, It, Mock, Times } from 'typemoq';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { authenticateBrowser } from './browser-authenticator';

const setupPortalAuthenticationFlow = (
    pageMock: IMock<Puppeteer.Page>,
    keyboardMock: IMock<Puppeteer.Keyboard>,
    accountName: string,
    accountPass: string,
    loggerMock: IMock<typeof apifyLog>,
    success: boolean = true,
    times: number = 1,
) => {
    keyboardMock.setup((k) => k.press('Enter')).verifiable(Times.exactly(2 * times));
    pageMock.setup((p) => p.goto('https://portal.azure.com')).verifiable(Times.exactly(times));
    pageMock.setup((p) => p.waitForSelector(It.isAnyString())).verifiable(Times.exactly(2 * times));
    pageMock.setup((p) => p.type(It.isAnyString(), accountName)).verifiable(Times.exactly(times));
    pageMock.setup((p) => p.type(It.isAnyString(), accountPass)).verifiable(Times.exactly(times));
    pageMock.setup((p) => p.click('#FormsAuthentication')).verifiable(Times.exactly(times));
    pageMock.setup((p) => p.waitForNavigation({ waitUntil: 'networkidle0' })).verifiable(Times.exactly(times));
    pageMock.setup((p) => p.$eval('#errorText', It.isAny())).returns(() => Promise.resolve(success ? '' : 'this is an error'));
    pageMock
        .setup((p) => p.url())
        .returns(() => (success ? 'https://ms.portal.azure.com' : 'https://login.microsoftonline.com'))
        .verifiable(Times.exactly(times));
    pageMock.setup((p) => p.close()).verifiable(Times.once());
    if (success) {
        loggerMock.setup((l) => l.info(It.isAnyString())).verifiable(Times.once());
    } else {
        loggerMock.setup((l) => l.warning(It.isAnyString())).verifiable(Times.exactly(times - 1));
        loggerMock.setup((l) => l.error(It.isAnyString())).verifiable(Times.once());
    }
};

describe(authenticateBrowser, () => {
    const accountName = 'testServiceAccount';
    const accountPass = 'test123';
    let pageMock: IMock<Puppeteer.Page>;
    let browserMock: IMock<Puppeteer.Browser>;
    let keyboardMock: IMock<Puppeteer.Keyboard>;
    let loggerMock: IMock<typeof apifyLog>;
    beforeEach(() => {
        loggerMock = Mock.ofType<typeof apifyLog>();
        keyboardMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Keyboard>());
        pageMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Page>());
        pageMock.setup((p) => p.keyboard).returns(() => keyboardMock.object);
        browserMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Browser>());
        browserMock
            .setup(async (b) => b.newPage())
            .returns(() => Promise.resolve(pageMock.object))
            .verifiable(Times.exactly(1));
    });

    it('follows portal.azure.com authentication flow', async () => {
        setupPortalAuthenticationFlow(pageMock, keyboardMock, accountName, accountPass, loggerMock);
        await authenticateBrowser(browserMock.object, accountName, accountPass, loggerMock.object);
        browserMock.verifyAll();
        pageMock.verifyAll();
        keyboardMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('retries four times if it detects authentication failed', async () => {
        setupPortalAuthenticationFlow(pageMock, keyboardMock, accountName, accountPass, loggerMock, false, 5);
        await authenticateBrowser(browserMock.object, accountName, accountPass, loggerMock.object);
        browserMock.verifyAll();
        pageMock.verifyAll();
        keyboardMock.verifyAll();
        loggerMock.verifyAll();
    });
});
