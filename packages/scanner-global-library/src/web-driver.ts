// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PromiseUtils } from 'common';
import { inject, injectable, optional } from 'inversify';
import { GlobalLogger, Logger } from 'logger';
import Puppeteer from 'puppeteer';
import { defaultBrowserOptions, defaultLaunchOptions } from './puppeteer-options';
import { ModHttpHeader } from './browser-extensions/mod-http-header';

@injectable()
export class WebDriver {
    public browser: Puppeteer.Browser;

    private readonly browserCloseTimeoutMsecs = 60000;

    constructor(
        @inject(ModHttpHeader) private readonly modHttpHeader: ModHttpHeader,
        @inject(PromiseUtils) private readonly promiseUtils: PromiseUtils,
        @inject(GlobalLogger) @optional() private readonly logger: Logger,
        private readonly puppeteer: typeof Puppeteer = Puppeteer,
    ) {}

    public async connect(wsEndpoint: string): Promise<Puppeteer.Browser> {
        this.browser = await this.puppeteer.connect({
            browserWSEndpoint: wsEndpoint,
            ...defaultBrowserOptions,
        });
        this.logger?.logInfo('Chromium browser instance connected.');

        return this.browser;
    }

    public async launch(browserExecutablePath?: string): Promise<Puppeteer.Browser> {
        if (process.env.MOD_HTTP_HEADER === 'true') {
            this.browser = await this.modHttpHeader.launchWithExtension(browserExecutablePath);
        } else {
            const options = {
                ...defaultLaunchOptions,
                headless: process.env.HEADLESS === 'false' ? false : true,
            };
            this.browser = await this.puppeteer.launch({
                executablePath: browserExecutablePath,
                ...options,
            });
        }

        this.logger?.logInfo('Chromium browser instance started.');

        return this.browser;
    }

    // private getManifest(path: string): Manifest {
    //     // eslint-disable-next-line security/detect-non-literal-fs-filename
    //     const content = fs.readFileSync(path, { encoding: 'utf8' });

    //     return JSON.parse(content) as Manifest;
    // }

    // private getManifestFile(path: string, validator: (manifest: Manifest) => boolean): { manifest: Manifest; path: string } {
    //     const separator = process.platform === 'win32' ? '\\' : '/';
    //     // eslint-disable-next-line security/detect-non-literal-fs-filename
    //     const entries = fs.readdirSync(path, { withFileTypes: true });
    //     const files = entries.filter((file) => !file.isDirectory() && file.name === 'manifest.json');
    //     const folders = entries.filter((folder) => folder.isDirectory());
    //     for (const file of files) {
    //         const manifest = this.getManifest(`${path}${separator}${file.name}`);
    //         if (validator(manifest)) {
    //             return { manifest, path };
    //         }
    //     }

    //     for (const folder of folders) {
    //         const manifest = this.getManifestFile(`${path}${separator}${folder.name}`, validator);
    //         if (manifest) {
    //             return manifest;
    //         }
    //     }

    //     return undefined;
    // }

    // private findExtension(name: string): { name: string; id: string; path: string; url: string } {
    //     if (['win32', 'darwin'].includes(process.platform) === false) {
    //         throw new Error(`Unsupported operating system platform: ${process.platform}`);
    //     }

    //     const userId = os.userInfo().username;
    //     const extensionFolderMac = `/Users/${userId}/Library/Application Support/Google/Chrome/Default/Extensions`;
    //     const extensionFolderWin = `C:\\Users\\${userId}\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Extensions`;
    //     const extensionFolder = process.platform === 'win32' ? extensionFolderWin : extensionFolderMac;
    //     const manifestFile = this.getManifestFile(extensionFolder, (manifest) => manifest.name === name);
    //     if (manifestFile === undefined) {
    //         throw new Error(`Chrome extension ${name} not found at ${extensionFolder}`);
    //     }

    //     const separator = process.platform === 'win32' ? '\\' : '/';
    //     const id = manifestFile.path.split(`${separator}Extensions${separator}`)[1].split(separator)[0];
    //     const url = `chrome-extension://${id}/${manifestFile.manifest.browser_action.default_popup}`;

    //     return { name, id, path: manifestFile.path, url };
    // }

    // public async launch(browserExecutablePath?: string): Promise<Puppeteer.Browser> {
    //     const extension = this.findExtension('ModHeader');

    //     const options = {
    //         ...defaultLaunchOptions,
    //     };
    //     options.headless = process.env.HEADLESS === 'false' ? false : true;
    //     options.args.push(...[`--disable-extensions-except=${extension.path}`, `--load-extension=${extension.path}`]);

    //     this.browser = await this.puppeteer.launch({
    //         executablePath: browserExecutablePath,
    //         ...options,
    //     });

    //     const extensionPage = await this.browser.newPage();
    //     await extensionPage.bringToFront();
    //     await extensionPage.goto(`chrome://version/`);
    // open any webpage first to force extension page rendering on subsequent navigation
    //     await extensionPage.goto(extension.url, { waitUntil: 'load' });

    //     await System.wait(1000);

    //     const nameInput = await extensionPage.$('#request-header > div:nth-child(2) > label:nth-child(2) > input');
    //     await nameInput.type('X-Forwarded-For');
    //     const valueInput = await extensionPage.$('#request-header > div:nth-child(2) > label:nth-child(3) > input');
    //     await valueInput.type('2.15.255.255');

    //     await System.wait(1000);

    //     this.logger?.logInfo('Chromium browser instance started.');

    //     return this.browser;
    // }

    public async close(): Promise<void> {
        if (this.browser !== undefined) {
            await this.promiseUtils.waitFor(this.closeBrowser(), this.browserCloseTimeoutMsecs, async () => {
                this.logger?.logError(`Browser failed to close with timeout of ${this.browserCloseTimeoutMsecs} ms.`);
                if (this.browser.process()) {
                    this.logger?.logInfo('Sending kill signal to browser process');
                    this.browser.process().kill('SIGINT');
                }
            });

            this.logger?.logInfo('Chromium browser instance stopped.');
        }
    }

    private async closeBrowser(): Promise<void> {
        const browserPages = await this.browser.pages();
        await Promise.all(browserPages.map((p) => p.close()));
        await this.browser.close();
    }
}
