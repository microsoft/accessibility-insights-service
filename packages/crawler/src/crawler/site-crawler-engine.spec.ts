// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as Crawlee from '@crawlee/puppeteer';
import { IMock, It, Mock } from 'typemoq';
import * as Puppeteer from 'puppeteer';
// eslint-disable-next-line @typescript-eslint/tslint/config
import PuppeteerExtra, { PuppeteerExtraPlugin } from 'puppeteer-extra';
// eslint-disable-next-line @typescript-eslint/tslint/config
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { StealthPluginType, UserAgentPlugin } from 'scanner-global-library';
import { PageProcessor, PageProcessorBase } from '../page-processors/page-processor-base';
import { CrawlerRunOptions } from '../types/crawler-run-options';
import { AuthenticatorFactory } from '../authenticator/authenticator-factory';
import { Authenticator } from '../authenticator/authenticator';
import { ApifyRequestQueueProvider } from '../apify/apify-request-queue-creator';
import { CrawlerConfiguration } from './crawler-configuration';
import { SiteCrawlerEngine } from './site-crawler-engine';
import { CrawlerFactory } from './crawler-factory';

/* eslint-disable
   @typescript-eslint/no-explicit-any,
   no-empty,@typescript-eslint/no-empty-function,
   @typescript-eslint/consistent-type-assertions */

const puppeteerDefaultOptions = [
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--js-flags=--max-old-space-size=8192',
];
const maxRequestsPerCrawl: number = 100;
const pageProcessorStub: PageProcessor = {
    requestHandler: () => Promise.resolve(null),
    failedRequestHandler: () => Promise.resolve(null),
};

let pageProcessorFactoryStub: () => PageProcessorBase;
let authenticatorFactoryMock: IMock<AuthenticatorFactory>;
let crawlerRunOptions: CrawlerRunOptions;
let crawlerFactoryMock: IMock<CrawlerFactory>;
let requestQueueStub: Crawlee.RequestQueue;
let puppeteerCrawlerMock: IMock<Crawlee.PuppeteerCrawler>;
let crawlerConfigurationMock: IMock<CrawlerConfiguration>;
let puppeteerCrawlerOptions: Crawlee.PuppeteerCrawlerOptions;
let crawlerEngine: SiteCrawlerEngine;
let requestQueueProvider: ApifyRequestQueueProvider;
let authenticatorMock: IMock<Authenticator>;
let puppeteerExtraMock: IMock<typeof PuppeteerExtra>;
let userAgentPluginMock: IMock<UserAgentPlugin>;
let ItIsOptionsWith: () => Crawlee.PuppeteerCrawlerOptions;
let puppeteerMock: IMock<typeof Puppeteer>;

describe(SiteCrawlerEngine, () => {
    beforeEach(() => {
        authenticatorFactoryMock = Mock.ofType<AuthenticatorFactory>();
        crawlerFactoryMock = Mock.ofType<CrawlerFactory>();
        requestQueueStub = {} as Crawlee.RequestQueue;
        puppeteerCrawlerMock = Mock.ofType<Crawlee.PuppeteerCrawler>();
        crawlerConfigurationMock = Mock.ofType(CrawlerConfiguration);
        authenticatorMock = Mock.ofType<Authenticator>();
        puppeteerExtraMock = Mock.ofType<typeof PuppeteerExtra>();
        userAgentPluginMock = Mock.ofType<UserAgentPlugin>();
        puppeteerMock = Mock.ofType<typeof Puppeteer>();

        puppeteerMock.setup((o) => o.executablePath()).returns(() => 'executablePath');

        crawlerRunOptions = {
            localOutputDir: 'localOutputDir',
            memoryMBytes: 100,
            silentMode: true,
            debug: false,
        } as CrawlerRunOptions;

        crawlerConfigurationMock
            .setup((o) => o.maxRequestsPerCrawl())
            .returns(() => maxRequestsPerCrawl)
            .verifiable();
        crawlerConfigurationMock.setup((o) => o.setDefaultApifySettings()).verifiable();
        crawlerConfigurationMock.setup((o) => o.setLocalOutputDir(crawlerRunOptions.localOutputDir)).verifiable();
        crawlerConfigurationMock.setup((o) => o.setMemoryMBytes(crawlerRunOptions.memoryMBytes)).verifiable();
        crawlerConfigurationMock.setup((o) => o.setSilentMode(crawlerRunOptions.silentMode)).verifiable();

        puppeteerCrawlerOptions = {
            useSessionPool: true,
            requestHandlerTimeoutSecs: 180,
            requestQueue: requestQueueStub,
            requestHandler: pageProcessorStub.requestHandler,
            failedRequestHandler: pageProcessorStub.failedRequestHandler,
            maxRequestsPerCrawl: maxRequestsPerCrawl,
            launchContext: {
                launcher: puppeteerExtraMock.object,
                launchOptions: {
                    ignoreDefaultArgs: puppeteerDefaultOptions,
                    defaultViewport: {
                        width: 1920,
                        height: 1080,
                        deviceScaleFactor: 1,
                    },
                    executablePath: crawlerRunOptions.chromePath ?? 'executablePath',
                },
            },
        };
        ItIsOptionsWith = () =>
            It.isObjectWith(puppeteerCrawlerOptions) &&
            It.is(
                (o: Crawlee.PuppeteerCrawlerOptions) =>
                    o.browserPoolOptions.useFingerprints === false && o.browserPoolOptions.postPageCreateHooks !== undefined,
            );

        puppeteerCrawlerMock.setup((o) => o.run()).verifiable();
        setupPuppeteerPlugins();

        requestQueueProvider = () => Promise.resolve(requestQueueStub);
        pageProcessorFactoryStub = jest.fn().mockImplementation(() => pageProcessorStub as PageProcessorBase);
        crawlerEngine = new SiteCrawlerEngine(
            pageProcessorFactoryStub,
            requestQueueProvider,
            crawlerFactoryMock.object,
            authenticatorFactoryMock.object,
            crawlerConfigurationMock.object,
            userAgentPluginMock.object,
            puppeteerMock.object,
            puppeteerExtraMock.object,
            StealthPlugin(),
        );
    });

    afterEach(() => {
        crawlerFactoryMock.verifyAll();
        puppeteerCrawlerMock.verifyAll();
        crawlerConfigurationMock.verifyAll();
        authenticatorFactoryMock.verifyAll();
        authenticatorMock.verifyAll();
        expect(pageProcessorFactoryStub).toHaveBeenCalledTimes(1);
        validateStealthPlugins();
    });

    it('run crawler with settings validation', async () => {
        crawlerFactoryMock
            .setup((o) => o.createPuppeteerCrawler(ItIsOptionsWith()))
            .returns(() => puppeteerCrawlerMock.object)
            .verifiable();

        await crawlerEngine.start(crawlerRunOptions);
    });

    it('run crawler while chrome path is set', async () => {
        crawlerRunOptions.chromePath = 'chrome path';
        crawlerConfigurationMock.setup((o) => o.setChromePath(crawlerRunOptions.chromePath)).verifiable();

        puppeteerCrawlerOptions.launchContext.useChrome = true;
        puppeteerCrawlerOptions.launchContext.launchOptions.executablePath = crawlerRunOptions.chromePath;
        crawlerFactoryMock
            .setup((o) => o.createPuppeteerCrawler(ItIsOptionsWith()))
            .returns(() => puppeteerCrawlerMock.object)
            .verifiable();

        await crawlerEngine.start(crawlerRunOptions);
    });

    it.each([true, false])('returns list of urls with singleWorker = %s', async (singleWorker) => {
        crawlerRunOptions.singleWorker = singleWorker;

        if (singleWorker) {
            puppeteerCrawlerOptions.minConcurrency = 1;
            puppeteerCrawlerOptions.maxConcurrency = 1;
        }

        crawlerFactoryMock
            .setup((o) => o.createPuppeteerCrawler(ItIsOptionsWith()))
            .returns(() => puppeteerCrawlerMock.object)
            .verifiable();

        await crawlerEngine.start(crawlerRunOptions);
    });

    it('run crawler while serviceAccountName, serviceAccountPassword, and authType are set', async () => {
        const testAccountName = 'testAccount@microsoft.com';
        const testAccountPassword = 'testpassword';
        const testAuthType = 'AAD';
        crawlerRunOptions.serviceAccountName = testAccountName;
        crawlerRunOptions.serviceAccountPassword = testAccountPassword;
        crawlerRunOptions.authType = testAuthType;

        authenticatorFactoryMock
            .setup((o) => o.createAuthenticator(testAccountName, testAccountPassword, testAuthType))
            .returns(() => authenticatorMock.object)
            .verifiable();

        crawlerFactoryMock
            .setup((o) => o.createPuppeteerCrawler(ItIsOptionsWith()))
            .returns(() => puppeteerCrawlerMock.object)
            .verifiable();

        await crawlerEngine.start(crawlerRunOptions);
    });
});

function setupPuppeteerPlugins(): void {
    const userAgentPlugin = { name: 'user-agent-plugin' } as unknown as PuppeteerExtraPlugin;
    const stealthAgentPlugin = { name: 'stealth' } as unknown as PuppeteerExtraPlugin;
    puppeteerExtraMock
        .setup((o) => o.use(It.isObjectWith(userAgentPlugin)))
        .returns(() => puppeteerExtraMock.object)
        .verifiable();
    puppeteerExtraMock
        .setup((o) => o.use(It.isObjectWith(stealthAgentPlugin)))
        .returns(() => puppeteerExtraMock.object)
        .verifiable();
}

function validateStealthPlugins(): void {
    const stealthPlugin = (crawlerEngine as any).stealthPlugin as StealthPluginType;
    expect(stealthPlugin.enabledEvasions.has('iframe.contentWindow')).toEqual(false);
    expect(stealthPlugin.enabledEvasions.has('user-agent-override')).toEqual(false);
}
