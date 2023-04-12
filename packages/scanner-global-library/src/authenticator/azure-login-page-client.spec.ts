// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, It, Times } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { System } from 'common';
import { PageNavigator, NavigationResponse } from '../page-navigator';
import { AzureLoginPageClient } from './azure-login-page-client';
import { ServicePrincipalCredentialProvider, ServicePrincipalCredential } from './service-principal-credential-provider';

const selectorTimeoutMsec = 10000;

let pageNavigatorMock: IMock<PageNavigator>;
let servicePrincipalCredentialProviderMock: IMock<ServicePrincipalCredentialProvider>;
let servicePrincipalCredential: ServicePrincipalCredential;
let azureLoginPageClient: AzureLoginPageClient;
let puppeteerPageMock: IMock<Puppeteer.Page>;
let puppeteerKeyboardMock: IMock<Puppeteer.Keyboard>;

describe(AzureLoginPageClient, () => {
    beforeEach(() => {
        servicePrincipalCredential = {
            name: 'name',
            password: 'password',
        };
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        pageNavigatorMock = Mock.ofType<PageNavigator>();
        servicePrincipalCredentialProviderMock = Mock.ofType<ServicePrincipalCredentialProvider>();
        puppeteerKeyboardMock = Mock.ofType<Puppeteer.Keyboard>();
        puppeteerPageMock.setup((o) => o.keyboard).returns(() => puppeteerKeyboardMock.object);
        servicePrincipalCredentialProviderMock
            .setup((o) => o.getAzureAuthClientCredential())
            .returns(() => Promise.resolve(servicePrincipalCredential))
            .verifiable();

        azureLoginPageClient = new AzureLoginPageClient(pageNavigatorMock.object, servicePrincipalCredentialProviderMock.object);
    });

    afterEach(() => {
        puppeteerPageMock.verifyAll();
        pageNavigatorMock.verifyAll();
        servicePrincipalCredentialProviderMock.verifyAll();
        puppeteerKeyboardMock.verifyAll();
    });

    it('should complete authentication workflow', async () => {
        const authNavigationResponse = { httpResponse: { url: () => 'url' } } as NavigationResponse;
        setupEnterAccountName();
        setupClickNextButton();
        setupSelectPasswordAuthenticationOption();
        setupEnterAccountPassword();
        setupSubmitForAuthentication(authNavigationResponse);
        setupValidateMfaPrompt();
        setupKMSIPrompt();

        const navigationResponse = await azureLoginPageClient.login(puppeteerPageMock.object);
        expect(navigationResponse).toEqual(authNavigationResponse);
    });
});

function setupKMSIPrompt(): void {
    setupGetElementContent('#idSIButton9', '');
    puppeteerKeyboardMock
        .setup((o) => o.press('Enter'))
        .returns(() => Promise.resolve())
        .verifiable(Times.atLeast(3));
}

function setupValidateMfaPrompt(): void {
    setupGetElementContent('#CertificateAuthentication');
    setupGetElementContent('#WindowsAzureMultiFactorAuthentication');
}

function setupSubmitForAuthentication(navigationResponse: NavigationResponse = {}): void {
    pageNavigatorMock
        .setup((o) => o.waitForNavigation(puppeteerPageMock.object))
        .returns(() => Promise.resolve(navigationResponse))
        .verifiable(Times.atLeast(2));
    puppeteerKeyboardMock
        .setup((o) => o.press('Enter'))
        .returns(() => Promise.resolve())
        .verifiable(Times.atLeast(2));
}

function setupEnterAccountPassword(): void {
    setupPageWaitForSelector('input[type="password"]');
    puppeteerPageMock
        .setup((o) => o.type('input[type="password"]', servicePrincipalCredential.password))
        .returns(() => Promise.resolve())
        .verifiable();
}

function setupSelectPasswordAuthenticationOption(): void {
    setupPageWaitForSelector('#FormsAuthentication');
    puppeteerPageMock
        .setup((o) => o.click('#FormsAuthentication'))
        .returns(() => Promise.resolve())
        .verifiable();
}

function setupClickNextButton(navigationResponse: NavigationResponse = {}): void {
    System.wait = () => Promise.resolve();
    pageNavigatorMock
        .setup((o) => o.waitForNavigation(puppeteerPageMock.object))
        .returns(() => Promise.resolve(navigationResponse))
        .verifiable(Times.atLeast(1));
    puppeteerKeyboardMock
        .setup((o) => o.press('Enter'))
        .returns(() => Promise.resolve())
        .verifiable(Times.atLeast(1));
}

function setupEnterAccountName(): void {
    setupPageWaitForSelector('input[name="loginfmt"]');
    puppeteerPageMock
        .setup((o) => o.type('input[name="loginfmt"]', servicePrincipalCredential.name))
        .returns(() => Promise.resolve())
        .verifiable();
}

function setupPageWaitForSelector(selector: string): void {
    puppeteerPageMock
        .setup((o) => o.waitForSelector(selector, { timeout: selectorTimeoutMsec }))
        .returns(() => Promise.resolve(null))
        .verifiable();
}

function setupGetElementContent(errorMessageSelector: string, content?: string): void {
    puppeteerPageMock
        .setup((o) => o.$eval(errorMessageSelector, It.isAny()))
        .returns(() => Promise.resolve(content))
        .verifiable(Times.atLeast(1));
}
