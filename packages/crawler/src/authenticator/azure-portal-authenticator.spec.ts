// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { IMock, It, Mock, Times } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { AzurePortalAuthentication } from './azure-portal-authenticator';

function setupPortalAuthenticationFlow(
    pageMock: IMock<Puppeteer.Page>,
    keyboardMock: IMock<Puppeteer.Keyboard>,
    accountName: string,
    accountPassword: string,
    success: boolean = true,
    times: number = 1,
): void {
    keyboardMock.setup((k) => k.press('Enter')).verifiable(Times.exactly(2 * times));
    pageMock.setup((p) => p.goto('https://portal.azure.com')).verifiable(Times.exactly(times));
    pageMock.setup((p) => p.waitForSelector(It.isAnyString())).verifiable(Times.exactly(2 * times));
    pageMock.setup((p) => p.type(It.isAnyString(), accountName)).verifiable(Times.exactly(times));
    pageMock.setup((p) => p.type(It.isAnyString(), accountPassword)).verifiable(Times.exactly(times));
    pageMock.setup((p) => p.click('#FormsAuthentication')).verifiable(Times.exactly(times));
    pageMock.setup((p) => p.waitForNavigation({ waitUntil: 'networkidle0' })).verifiable(Times.exactly(times));
    pageMock.setup((p) => p.$eval('#errorText', It.isAny())).returns(() => Promise.resolve(success ? '' : 'this is an error'));
    pageMock
        .setup((p) => p.url())
        .returns(() => (success ? 'https://ms.portal.azure.com' : 'https://login.microsoftonline.com'))
        .verifiable(Times.exactly(times));
}

describe(AzurePortalAuthentication, () => {
    const accountName = 'testServiceAccount';
    const accountPassword = 'placeholder';
    let pageMock: IMock<Puppeteer.Page>;
    let keyboardMock: IMock<Puppeteer.Keyboard>;
    let testSubject: AzurePortalAuthentication;
    beforeEach(() => {
        keyboardMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Keyboard>());
        pageMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Page>());
        pageMock.setup((p) => p.keyboard).returns(() => keyboardMock.object);
        testSubject = new AzurePortalAuthentication(accountName, accountPassword);
    });

    afterEach(() => {
        pageMock.verifyAll();
        keyboardMock.verifyAll();
    });

    it('follows portal.azure.com authentication flow', async () => {
        setupPortalAuthenticationFlow(pageMock, keyboardMock, accountName, accountPassword);
        await testSubject.authenticate(pageMock.object);
    });

    it('retries four times if it detects authentication failed', async () => {
        setupPortalAuthenticationFlow(pageMock, keyboardMock, accountName, accountPassword, false, 5);
        await testSubject.authenticate(pageMock.object);
    });
});
