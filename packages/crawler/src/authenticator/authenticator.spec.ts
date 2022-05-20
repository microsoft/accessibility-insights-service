// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import Apify from 'apify';
import Puppeteer from 'puppeteer';
import { IMock, It, Mock, Times } from 'typemoq';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { AuthenticationFlow, AuthenticationStep } from './authentication-flow';
import { Authenticator } from './authenticator';

describe(Authenticator, () => {
    const testAccountName = 'testServiceAccount';
    const testAccountPassword = 'test123';
    const testAuthenticationSteps: AuthenticationStep[] = [
        {
            operation: 'type',
            selector: '#username',
            credential: 'name',
            value: testAccountName,
        },
        {
            operation: 'click',
            selector: '#1',
        },
        {
            operation: 'waitForNavigation',
        },
        {
            operation: 'type',
            selector: '#password',
            credential: 'password',
            value: testAccountPassword,
        },
        {
            operation: 'enter',
        },
        {
            operation: 'waitForNavigation',
        },
    ];

    const testAuthenticationFlow: AuthenticationFlow = {
        startingUrl: 'https://example.com',
        authenticatedUrl: 'https://example.com/en',
        steps: testAuthenticationSteps,
    };

    function setupAuthenticationFlow(
        flow: AuthenticationFlow,
        pageMock: IMock<Puppeteer.Page>,
        keyboardMock: IMock<Puppeteer.Keyboard>,
        success: boolean = true,
        times: number = 1,
    ) {
        pageMock.setup((o) => o.goto(flow.startingUrl)).verifiable(Times.exactly(times));
        const operationCounts = flow.steps.reduce((counts: { [operation: string]: number }, currentStep: AuthenticationStep) => {
            counts[currentStep.operation] = (counts[currentStep.operation] || 0) + 1;
            return counts;
        }, {});
        keyboardMock.setup((o) => o.press('Enter')).verifiable(Times.exactly(operationCounts['enter'] * times));
        pageMock
            .setup((o) => o.waitForSelector(It.isAnyString()))
            .verifiable(Times.exactly((operationCounts['type'] + operationCounts['click']) * times));
        pageMock.setup((o) => o.type(It.isAnyString(), testAccountName)).verifiable(Times.exactly(times));
        pageMock.setup((o) => o.type(It.isAnyString(), testAccountPassword)).verifiable(Times.exactly(times));
        pageMock.setup((o) => o.click(It.isAnyString())).verifiable(Times.exactly(operationCounts['click'] * times));
        pageMock
            .setup((o) => o.waitForNavigation({ waitUntil: 'networkidle0' }))
            .verifiable(Times.exactly(operationCounts['waitForNavigation'] * times));
        pageMock.setup((o) => o.$eval('#errorText', It.isAny())).returns(() => Promise.resolve(success ? '' : 'this is an error'));
        pageMock
            .setup((o) => o.url())
            .returns(() => (success ? flow.authenticatedUrl : 'https://not.logged.in'))
            .verifiable(Times.exactly(times));
        pageMock.setup((o) => o.close()).verifiable(Times.once());
    }

    function setupLogger(loggerMock: IMock<typeof Apify.utils.log>, success: boolean = true, times: number = 1) {
        if (success) {
            loggerMock.setup((o) => o.info(It.isAnyString())).verifiable(Times.once());
        } else {
            loggerMock.setup((o) => o.warning(It.isAnyString())).verifiable(Times.exactly(times - 1));
            loggerMock.setup((o) => o.error(It.isAnyString())).verifiable(Times.once());
        }
    }

    let pageMock: IMock<Puppeteer.Page>;
    let browserMock: IMock<Puppeteer.Browser>;
    let keyboardMock: IMock<Puppeteer.Keyboard>;
    let loggerMock: IMock<typeof Apify.utils.log>;
    let authenticator: Authenticator;
    beforeEach(() => {
        loggerMock = Mock.ofType<typeof Apify.utils.log>();
        keyboardMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Keyboard>());
        pageMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Page>());
        pageMock.setup((o) => o.keyboard).returns(() => keyboardMock.object);
        browserMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Browser>());
        browserMock
            .setup(async (o) => o.newPage())
            .returns(() => Promise.resolve(pageMock.object))
            .verifiable();

        authenticator = new Authenticator(testAuthenticationFlow, loggerMock.object);
    });

    afterEach(() => {
        browserMock.verifyAll();
        pageMock.verifyAll();
        keyboardMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('executes authentication steps for authentication flow', async () => {
        setupAuthenticationFlow(testAuthenticationFlow, pageMock, keyboardMock);
        setupLogger(loggerMock);
        await authenticator.run(browserMock.object);
    });

    it('retries four times if it detects authentication failed', async () => {
        setupAuthenticationFlow(testAuthenticationFlow, pageMock, keyboardMock, false, 5);
        setupLogger(loggerMock, false, 5);
        await authenticator.run(browserMock.object);
    });
});
