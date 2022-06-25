// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as nodeOs from 'os';
import * as nodeFs from 'fs';
import { System } from 'common';
import { injectable, inject, optional } from 'inversify';
import { GlobalLogger, Logger } from 'logger';
import Puppeteer from 'puppeteer';
import { isEmpty } from 'lodash';
import { defaultLaunchOptions } from '../puppeteer-options';

/* eslint-disable security/detect-non-literal-fs-filename */

export interface Manifest {
    name: string;
    browser_action: {
        default_popup: string;
    };
}

@injectable()
export class ModHttpHeader {
    private readonly extensionName = 'ModHeader';

    private readonly nameInputSelector = '#request-header > div:nth-child(2) > label:nth-child(2) > input';

    private readonly valueInputSelector = '#request-header > div:nth-child(2) > label:nth-child(3) > input';

    constructor(
        @inject(GlobalLogger) @optional() private readonly logger: Logger,
        private readonly puppeteer: typeof Puppeteer = Puppeteer,
        private readonly os: typeof nodeOs = nodeOs,
        private readonly fs: typeof nodeFs = nodeFs,
    ) {}

    public async launchWithExtension(browserExecutablePath?: string): Promise<Puppeteer.Browser> {
        const extension = this.findExtension(this.extensionName);

        const options = {
            ...defaultLaunchOptions,
        };
        options.headless = false; // required to load extension
        options.args.push(...[`--disable-extensions-except=${extension.path}`, `--load-extension=${extension.path}`]);

        const browser = await this.puppeteer.launch({
            executablePath: browserExecutablePath,
            ...options,
        });

        await this.configureExtension(browser, extension.url);
        this.logger?.logInfo(`Chrome web browser extension ${this.extensionName} was loaded.`);

        return browser;
    }

    private async configureExtension(browser: Puppeteer.Browser, extensionUrl: string): Promise<void> {
        const extensionPage = await browser.newPage();
        // open any webpage first to force extension page rendering on subsequent navigation
        await extensionPage.goto(`chrome://version/`);
        await extensionPage.goto(extensionUrl, { waitUntil: 'load' });

        await extensionPage.waitForSelector(this.nameInputSelector);
        const nameInput = await extensionPage.$(this.nameInputSelector);
        await nameInput.type('X-Forwarded-For');
        const valueInput = await extensionPage.$(this.valueInputSelector);
        await valueInput.type(process.env.X_FORWARDED_FOR_HTTP_HEADER ?? '2.15.255.255');
        await System.wait(1000); // wait for extension local store update
    }

    private getManifest(path: string): Manifest {
        const content = this.fs.readFileSync(path, { encoding: 'utf8' });

        return (isEmpty(content) ? {} : JSON.parse(content)) as Manifest;
    }

    private getManifestFile(path: string, validator: (manifest: Manifest) => boolean): { manifest: Manifest; path: string } {
        const separator = process.platform === 'win32' ? '\\' : '/';
        const entries = this.fs.readdirSync(path, { withFileTypes: true });
        const files = entries.filter((file) => !file.isDirectory() && file.name === 'manifest.json');
        const folders = entries.filter((folder) => folder.isDirectory());
        for (const file of files) {
            const manifest = this.getManifest(`${path}${separator}${file.name}`);
            if (validator(manifest)) {
                return { manifest, path };
            }
        }

        for (const folder of folders) {
            const manifest = this.getManifestFile(`${path}${separator}${folder.name}`, validator);
            if (manifest) {
                return manifest;
            }
        }

        return undefined;
    }

    private findExtension(name: string): { name: string; id: string; path: string; url: string } {
        if (['win32', 'darwin'].includes(process.platform) === false) {
            throw new Error(`Unsupported operating system platform: ${process.platform}`);
        }

        const userId = this.os.userInfo().username;
        const extensionFolderMac = `/Users/${userId}/Library/Application Support/Google/Chrome/Default/Extensions`;
        const extensionFolderWin = `C:\\Users\\${userId}\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Extensions`;
        const extensionFolder = process.platform === 'win32' ? extensionFolderWin : extensionFolderMac;
        const manifestFile = this.getManifestFile(extensionFolder, (manifest) => manifest.name === name);
        if (manifestFile === undefined) {
            throw new Error(`Chrome extension ${name} not found at ${extensionFolder}`);
        }

        const separator = process.platform === 'win32' ? '\\' : '/';
        const id = manifestFile.path.split(`${separator}Extensions${separator}`)[1].split(separator)[0];
        const url = `chrome-extension://${id}/${manifestFile.manifest.browser_action.default_popup}`;

        return { name, id, path: manifestFile.path, url };
    }
}
