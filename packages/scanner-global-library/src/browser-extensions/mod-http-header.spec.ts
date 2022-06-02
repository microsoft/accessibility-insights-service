// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import fs, { Dirent } from 'fs';
import os, { UserInfo } from 'os';
import { IMock, Mock } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { Logger } from 'logger';
import { cloneDeep } from 'lodash';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { defaultLaunchOptions } from '../puppeteer-options';
import { ModHttpHeader, Manifest } from './mod-http-header';

/* eslint-disable @typescript-eslint/no-explicit-any */

type puppeteerLaunch = (options?: Puppeteer.LaunchOptions) => Promise<Puppeteer.Browser>;

let modHttpHeader: ModHttpHeader;
let loggerMock: IMock<Logger>;
let puppeteerLaunchMock: IMock<puppeteerLaunch>;
let puppeteerBrowserMock: IMock<Puppeteer.Browser>;
let puppeteerPageMock: IMock<Puppeteer.Page>;
let elementHandleMock: IMock<Puppeteer.ElementHandle>;
let originalPlatform: NodeJS.Platform;
let fsMock: IMock<typeof fs>;
let osMock: IMock<typeof os>;
let manifest: Manifest;
let pathSeparator: string;
let extensionFolder: string;
let extensionPath: string;

const userInfo = { username: 'userName' } as UserInfo<string>;
const extensionFolderMac = `/Users/userName/Library/Application Support/Google/Chrome/Default/Extensions`;
const extensionFolderWin = `C:\\Users\\userName\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Extensions`;

describe(ModHttpHeader, () => {
    beforeEach(() => {
        puppeteerBrowserMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Browser>());
        puppeteerPageMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Page>());
        elementHandleMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.ElementHandle>());
        puppeteerLaunchMock = Mock.ofType<puppeteerLaunch>();
        loggerMock = Mock.ofType<Logger>();
        fsMock = Mock.ofType<typeof fs>();
        osMock = Mock.ofType<typeof os>();

        const puppeteer = Puppeteer;
        puppeteer.launch = puppeteerLaunchMock.object;

        process.env.X_FORWARDED_FOR_HTTP_HEADER = '1.1.1.1';

        osMock
            .setup((o) => o.userInfo())
            .returns(() => userInfo)
            .verifiable();

        puppeteerBrowserMock
            .setup(async (o) => o.newPage())
            .returns(() => Promise.resolve(puppeteerPageMock.object))
            .verifiable();

        manifest = {
            name: 'ModHeader',
            browser_action: {
                default_popup: 'popup.html',
            },
        };

        modHttpHeader = new ModHttpHeader(loggerMock.object, puppeteer, osMock.object, fsMock.object);
    });

    afterEach(() => {
        Object.defineProperty(process, 'platform', {
            value: originalPlatform,
        });

        puppeteerLaunchMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('launch browser with extension on mac os', async () => {
        setupForMacOs();
        setupBrowserLaunch();
        setupExtensionLocation();
        setupExtensionConfiguration();

        const actualBrowser = await modHttpHeader.launchWithExtension('executablePath');
        expect(actualBrowser).toEqual(puppeteerBrowserMock.object);
    });

    it('launch browser with extension on windows os', async () => {
        setupForWinOs();
        setupBrowserLaunch();
        setupExtensionLocation();
        setupExtensionConfiguration();

        const actualBrowser = await modHttpHeader.launchWithExtension('executablePath');
        expect(actualBrowser).toEqual(puppeteerBrowserMock.object);
    });
});

function setupForMacOs(): void {
    pathSeparator = '/';
    extensionFolder = extensionFolderMac;
    extensionPath = `${extensionFolder}${pathSeparator}extDirId`;
    originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', {
        value: 'darwin',
    });
}

function setupForWinOs(): void {
    pathSeparator = '\\';
    extensionFolder = extensionFolderWin;
    extensionPath = `${extensionFolder}${pathSeparator}extDirId`;
    originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', {
        value: 'win32',
    });
}

function setupBrowserLaunch(): void {
    const options = {
        ...cloneDeep(defaultLaunchOptions),
    };
    options.headless = false;
    options.args.push(...[`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`]);
    puppeteerLaunchMock
        .setup((o) => o({ executablePath: 'executablePath', ...options }))
        .returns(() => Promise.resolve(puppeteerBrowserMock.object))
        .verifiable();
}

function setupExtensionConfiguration(): void {
    const url = `chrome-extension://extDirId${pathSeparator}${manifest.browser_action.default_popup}`;
    elementHandleMock
        .setup((o) => o.type('X-Forwarded-For'))
        .returns(() => Promise.resolve())
        .verifiable();
    elementHandleMock
        .setup((o) => o.type(process.env.X_FORWARDED_FOR_HTTP_HEADER))
        .returns(() => Promise.resolve())
        .verifiable();
    puppeteerPageMock
        .setup((o) => o.goto(`chrome://version/`))
        .returns(() => Promise.resolve({} as Puppeteer.HTTPResponse))
        .verifiable();
    puppeteerPageMock
        .setup((o) => o.goto(url, { waitUntil: 'load' }))
        .returns(() => Promise.resolve({} as Puppeteer.HTTPResponse))
        .verifiable();
    puppeteerPageMock
        .setup((o) => o.waitForSelector((modHttpHeader as any).nameInputSelector))
        .returns(() => Promise.resolve({} as Puppeteer.ElementHandle))
        .verifiable();
    puppeteerPageMock
        .setup((o) => o.$((modHttpHeader as any).nameInputSelector))
        .returns(() => Promise.resolve(elementHandleMock.object))
        .verifiable();
    puppeteerPageMock
        .setup((o) => o.$((modHttpHeader as any).valueInputSelector))
        .returns(() => Promise.resolve(elementHandleMock.object))
        .verifiable();
}

function setupExtensionLocation(): void {
    const rootDir = [
        {
            isDirectory: () => true,
            name: 'extDirId',
        },
        {
            isDirectory: () => false,
            name: 'manifest.json',
        },
    ] as Dirent[];
    const extDir = [
        {
            isDirectory: () => false,
            name: 'manifest.json',
        },
    ] as Dirent[];
    fsMock
        .setup((o) => o.readdirSync(extensionFolder, { withFileTypes: true }))
        .returns(() => rootDir)
        .verifiable();
    fsMock
        .setup((o) => o.readdirSync(`${extensionFolder}${pathSeparator}extDirId`, { withFileTypes: true }))
        .returns(() => extDir)
        .verifiable();
    fsMock
        .setup((o) => o.readFileSync(`${extensionFolder}${pathSeparator}manifest.json`, { encoding: 'utf8' }))
        .returns(() => '')
        .verifiable();
    fsMock
        .setup((o) => o.readFileSync(`${extensionFolder}${pathSeparator}extDirId${pathSeparator}manifest.json`, { encoding: 'utf8' }))
        .returns(() => JSON.stringify(manifest))
        .verifiable();
}
