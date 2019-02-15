import { AxePuppeteer } from 'axe-puppeteer';
import * as Puppeteer from 'puppeteer';
import { IMock, Mock } from 'typemoq';

import { AxePuppeteerFactory } from '../axe-puppeteer-factory';
import { Page } from './page';

// tslint:disable:no-any

describe('Page', () => {
    let puppeteePageMock: IMock<Puppeteer.Page>;
    let axePuppeteerFactoryMock: IMock<AxePuppeteerFactory>;
    let testSubject: Page;

    beforeEach(() => {
        puppeteePageMock = Mock.ofType<Puppeteer.Page>();
        axePuppeteerFactoryMock = Mock.ofType<AxePuppeteerFactory>();

        testSubject = new Page(puppeteePageMock.object, axePuppeteerFactoryMock.object);
    });

    it('should call setBypassCSP', async () => {
        const someValueFromCSPCall = 'stub data';

        puppeteePageMock.setup(async p => p.setBypassCSP(true)).returns(async () => Promise.resolve(someValueFromCSPCall as any));

        await expect(testSubject.enableBypassCSP()).resolves.toBe(someValueFromCSPCall);
    });

    it('should scan for a11y issues', async () => {
        const axePuppeteerMock = Mock.ofType<AxePuppeteer>();
        const axeResultsStub = 'axe results stub data' as any;

        axePuppeteerFactoryMock.setup(a => a.createInstance(puppeteePageMock.object)).returns(() => axePuppeteerMock.object);
        axePuppeteerMock.setup(async a => a.analyze()).returns(async () => Promise.resolve(axeResultsStub));

        const actualAxeResults = await testSubject.scanForA11yIssues();

        expect(actualAxeResults).toBe(axeResultsStub);
    });

    it('should goto url with wait for load', async () => {
        const url = 'url1';
        puppeteePageMock
            .setup(async p => p.goto(url, { waitUntil: ['load'] }))
            .returns(async () => Promise.resolve(undefined))
            .verifiable();
        puppeteePageMock
            .setup(async p => p.waitForNavigation({ waitUntil: ['networkidle0'], timeout: 15000 }))
            .returns(async () => Promise.resolve(undefined))
            .verifiable();

        await testSubject.goto(url);

        puppeteePageMock.verifyAll();
    });

    it('should fail if goto url call fails', async () => {
        const url = 'url1';
        puppeteePageMock
            .setup(async p => p.goto(url, { waitUntil: ['load'] }))
            .returns(async () => Promise.reject(undefined))
            .verifiable();
        puppeteePageMock
            .setup(async p => p.waitForNavigation({ waitUntil: ['networkidle0'], timeout: 15000 }))
            .returns(async () => Promise.resolve(undefined))
            .verifiable();

        await expect(testSubject.goto(url)).rejects.toEqual(undefined);

        puppeteePageMock.verifyAll();
    });

    it('should pass goto url if network wait fails', async () => {
        const url = 'url1';
        puppeteePageMock
            .setup(async p => p.goto(url, { waitUntil: ['load'] }))
            .returns(async () => Promise.resolve(undefined))
            .verifiable();
        puppeteePageMock
            .setup(async p => p.waitForNavigation({ waitUntil: ['networkidle0'], timeout: 15000 }))
            .returns(async () => Promise.reject(undefined))
            .verifiable();

        await expect(testSubject.goto(url)).resolves.toEqual(undefined);

        puppeteePageMock.verifyAll();
    });
});
