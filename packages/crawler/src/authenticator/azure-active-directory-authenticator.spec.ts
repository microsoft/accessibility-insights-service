// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { IMock, It, Mock, Times } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { AzureActiveDirectoryAuthentication } from './azure-active-directory-authenticator';

function setupAADAuthenticationFlow(
    pageMock: IMock<Puppeteer.Page>,
    keyboardMock: IMock<Puppeteer.Keyboard>,
    accountName: string,
    accountPassword: string,
    success: boolean = true,
): void {
    keyboardMock.setup((k) => k.press('Enter')).verifiable(Times.exactly(2));
    pageMock.setup((p) => p.goto('https://portal.azure.com')).verifiable(Times.exactly(1));
    pageMock.setup((p) => p.waitForSelector(It.isAnyString())).verifiable(Times.exactly(2));
    pageMock.setup((p) => p.type(It.isAnyString(), accountName)).verifiable(Times.exactly(1));
    pageMock.setup((p) => p.type(It.isAnyString(), accountPassword)).verifiable(Times.exactly(1));
    pageMock.setup((p) => p.click('#FormsAuthentication')).verifiable(Times.exactly(1));
    pageMock.setup((p) => p.waitForNavigation({ waitUntil: 'networkidle0' })).verifiable(Times.exactly(1));
    pageMock.setup((p) => p.$eval('#errorText', It.isAny())).returns(() => Promise.resolve(success ? '' : 'this is an error'));
    pageMock
        .setup((p) => p.url())
        .returns(() => 'https://login.microsoftonline.com')
        .verifiable(Times.exactly(2));

    if (success) {
        pageMock
            .setup((p) => p.url())
            .returns(() => 'https://ms.portal.azure.com')
            .verifiable(Times.exactly(2));
    } else {
        // If authentication fails we must setup a sequence of calls to the page.url() method
        // equaling the number of times it will be called. This is because in a successful scenario
        // the page.url() method will be called twice with different values each time. With multiple
        // setups you must have a setup for each time it is called, as detailed here: https://github.com/florinn/typemoq#record-and-replay
        for (let i = 0; i < 2; i++) {
            pageMock
                .setup((p) => p.url())
                .returns(() => 'https://login.microsoftonline.com')
                .verifiable(Times.exactly(2));
        }
    }
}

describe(AzureActiveDirectoryAuthentication, () => {
    const accountName = 'testServiceAccount';
    const accountPassword = 'Placeholder_test123';
    let pageMock: IMock<Puppeteer.Page>;
    let keyboardMock: IMock<Puppeteer.Keyboard>;
    let consoleInfoMock: jest.SpyInstance;
    let testSubject: AzureActiveDirectoryAuthentication;
    beforeEach(() => {
        consoleInfoMock = jest.spyOn(global.console, 'info').mockImplementation();
        keyboardMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Keyboard>());
        pageMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Page>());
        pageMock.setup((p) => p.keyboard).returns(() => keyboardMock.object);
        testSubject = new AzureActiveDirectoryAuthentication(accountName, accountPassword);
    });

    afterEach(() => {
        pageMock.verifyAll();
        keyboardMock.verifyAll();
        consoleInfoMock.mockRestore();
    });

    it('follows portal.azure.com authentication flow', async () => {
        setupAADAuthenticationFlow(pageMock, keyboardMock, accountName, accountPassword);
        await testSubject.authenticate(pageMock.object);
        expect(consoleInfoMock).toHaveBeenCalledWith('Authentication succeeded.');
    });

    it('throw error if authentication failed', async () => {
        setupAADAuthenticationFlow(pageMock, keyboardMock, accountName, accountPassword, false);
        expect.assertions(1);
        const expectedErrorMessage = new Error('Authentication failed with error: this is an error');
        try {
            await testSubject.authenticate(pageMock.object);
        } catch (error) {
            expect(error).toEqual(expectedErrorMessage);
        }
    });

    it('throws error if account name is invalid', async () => {
        keyboardMock.setup((k) => k.press('Enter')).verifiable(Times.exactly(1));
        pageMock.setup((p) => p.goto('https://portal.azure.com')).verifiable(Times.exactly(1));
        pageMock.setup((p) => p.waitForSelector(It.isAnyString())).verifiable(Times.exactly(1));
        pageMock.setup((p) => p.type(It.isAnyString(), accountName)).verifiable(Times.exactly(1));
        pageMock
            .setup((p) => p.$eval('#usernameError', It.isAny()))
            .returns(() => Promise.resolve("We couldn't find an account with that username. Try another, or get a new Microsoft account."))
            .verifiable(Times.exactly(1));
        pageMock
            .setup((o) => o.waitForNavigation())
            .returns(() => Promise.reject())
            .verifiable(Times.exactly(1));
        pageMock
            .setup((p) => p.url())
            .returns(() => 'https://login.microsoftonline.com')
            .verifiable(Times.exactly(1));

        expect.assertions(1);
        const expectedErrorMessage = new Error(
            "Authentication failed with error: We couldn't find an account with that username. Try another, or get a new Microsoft account.",
        );

        try {
            await testSubject.authenticate(pageMock.object);
        } catch (error) {
            expect(error).toEqual(expectedErrorMessage);
        }
    });
});
