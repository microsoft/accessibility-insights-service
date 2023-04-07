// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as Puppeteer from 'puppeteer';
import { IMock, Mock } from 'typemoq';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { AuthenticationMethod } from './authentication-method';
import { Authenticator } from './authenticator';

describe(Authenticator, () => {
    let pageMock: IMock<Puppeteer.Page>;
    let browserMock: IMock<Puppeteer.Browser>;
    let authenticationFlowMock: IMock<AuthenticationMethod>;
    let authenticator: Authenticator;
    beforeEach(() => {
        pageMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Page>());
        pageMock.setup((o) => o.close()).verifiable();
        browserMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Browser>());
        browserMock
            .setup(async (o) => o.newPage())
            .returns(() => Promise.resolve(pageMock.object))
            .verifiable();
        authenticationFlowMock = Mock.ofType<AuthenticationMethod>();
        authenticationFlowMock.setup((o) => o.authenticate(pageMock.object)).verifiable();
        authenticator = new Authenticator(authenticationFlowMock.object);
    });

    afterEach(() => {
        browserMock.verifyAll();
        pageMock.verifyAll();
        authenticationFlowMock.verifyAll();
    });

    it('opens a new page, authenticates the page, and closes the page', async () => {
        await authenticator.run(browserMock.object);
    });
});
