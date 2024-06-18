// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { System } from 'common';
import { DevToolsSession } from './dev-tools-session';
import { getPromisableDynamicMock } from './test-utilities/promisable-mock';

/* eslint-disable @typescript-eslint/no-explicit-any */

const cdpMethod = 'Page.captureSnapshot';
const cdpParams = { format: 'mhtml' } as any;
const cdpResult = { data: 'data' };

let puppeteerPageMock: IMock<Puppeteer.Page>;
let cdpSessionMock: IMock<Puppeteer.CDPSession>;
let devToolsSession: DevToolsSession;

describe(DevToolsSession, () => {
    beforeEach(() => {
        puppeteerPageMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Page>());
        cdpSessionMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.CDPSession>());
        devToolsSession = new DevToolsSession();
    });

    afterEach(() => {
        puppeteerPageMock.verifyAll();
        cdpSessionMock.verifyAll();
    });

    it('get result without CDP timeout', async () => {
        setupCDPSession();
        const actualResult = await devToolsSession.send(puppeteerPageMock.object, cdpMethod, cdpParams);

        expect(actualResult).toEqual(cdpResult);
    });

    it('get result with CDP timeout', async () => {
        setupCDPSession(1000);
        devToolsSession.cdpProtocolTimeout = 100;
        cdpSessionMock.setup((o) => (o as any)._onMessage({ id: 1 })).verifiable();

        const send = devToolsSession.send(puppeteerPageMock.object, cdpMethod, cdpParams);

        await expect(send).rejects.toThrow(/The CDP session timed out./);
    });
});

function setupCDPSession(timeout: number = undefined): void {
    cdpSessionMock
        .setup((o) => o.send(cdpMethod, cdpParams))
        .returns(async () => {
            if (timeout) {
                await System.wait(timeout);
            }

            return cdpResult;
        })
        .verifiable();
    cdpSessionMock
        .setup((o) => o.detach())
        .returns(() => Promise.resolve())
        .verifiable();
    puppeteerPageMock
        .setup((o) => o.createCDPSession())
        .returns(() => Promise.resolve(cdpSessionMock.object))
        .verifiable();
}
