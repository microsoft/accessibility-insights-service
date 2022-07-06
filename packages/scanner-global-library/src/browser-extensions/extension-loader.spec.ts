// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import fs, { Dirent } from 'fs';
import os, { UserInfo } from 'os';
import { IMock, Mock } from 'typemoq';
import { ExtensionLoader, Manifest, Extension } from './extension-loader';

/* eslint-disable @typescript-eslint/no-explicit-any */

let extensionLoader: ExtensionLoader;
let originalPlatform: NodeJS.Platform;
let fsMock: IMock<typeof fs>;
let osMock: IMock<typeof os>;
let manifest: Manifest;
let pathSeparator: string;
let extensionFolder: string;
let extensionPath: string;
let extension: Extension;

const extensionDir = 'extDirId';
const extensionName = 'extension-name';
const userInfo = { username: 'userName' } as UserInfo<string>;
const extensionFolderMac = `/Users/userName/Library/Application Support/Google/Chrome/Default/Extensions`;
const extensionFolderWin = `C:\\Users\\userName\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Extensions`;

describe(ExtensionLoader, () => {
    beforeEach(() => {
        fsMock = Mock.ofType<typeof fs>();
        osMock = Mock.ofType<typeof os>();

        osMock
            .setup((o) => o.userInfo())
            .returns(() => userInfo)
            .verifiable();
        manifest = {
            name: extensionName,
            browser_action: {
                default_popup: 'popup.html',
            },
        };
        extension = {
            id: extensionDir,
            name: extensionName,
            path: '',
        };

        extensionLoader = new ExtensionLoader(osMock.object, fsMock.object);
    });

    afterEach(() => {
        Object.defineProperty(process, 'platform', {
            value: originalPlatform,
        });
    });

    it('get extension by name on mac os', () => {
        setupForMacOs();
        setupExtensionLocation();

        const actualBrowser = extensionLoader.getExtension(extensionName, undefined);
        expect(actualBrowser).toEqual(extension);
    });

    it('get extension by id on mac os', () => {
        setupForMacOs();
        setupExtensionLocation();

        const actualBrowser = extensionLoader.getExtension(undefined, extensionDir);
        expect(actualBrowser).toEqual(extension);
    });

    it('get extension by name on windows os', () => {
        setupForWinOs();
        setupExtensionLocation();

        const actualBrowser = extensionLoader.getExtension(extensionName, undefined);
        expect(actualBrowser).toEqual(extension);
    });

    it('get extension by name on windows os', () => {
        setupForWinOs();
        setupExtensionLocation();

        const actualBrowser = extensionLoader.getExtension(undefined, extensionDir);
        expect(actualBrowser).toEqual(extension);
    });
});

function setupForMacOs(): void {
    pathSeparator = '/';
    extensionFolder = extensionFolderMac;
    extensionPath = `${extensionFolder}${pathSeparator}${extensionDir}`;
    extension.path = extensionPath;
    originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', {
        value: 'darwin',
    });
}

function setupForWinOs(): void {
    pathSeparator = '\\';
    extensionFolder = extensionFolderWin;
    extensionPath = `${extensionFolder}${pathSeparator}${extensionDir}`;
    extension.path = extensionPath;
    originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', {
        value: 'win32',
    });
}

function setupExtensionLocation(): void {
    const rootDir = [
        {
            isDirectory: () => true,
            name: extensionDir,
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
        .setup((o) => o.readdirSync(`${extensionFolder}${pathSeparator}${extensionDir}`, { withFileTypes: true }))
        .returns(() => extDir)
        .verifiable();
    fsMock
        .setup((o) => o.readFileSync(`${extensionFolder}${pathSeparator}manifest.json`, { encoding: 'utf8' }))
        .returns(() => '')
        .verifiable();
    fsMock
        .setup((o) =>
            o.readFileSync(`${extensionFolder}${pathSeparator}${extensionDir}${pathSeparator}manifest.json`, { encoding: 'utf8' }),
        )
        .returns(() => JSON.stringify(manifest))
        .verifiable();
}
