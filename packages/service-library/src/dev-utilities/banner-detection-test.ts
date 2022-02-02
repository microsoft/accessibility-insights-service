// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import fs from 'fs';
import readline from 'readline';
import {
    BrowserError,
    Page,
    PageConfigurator,
    PageHandler,
    PageNavigator,
    PageResponseProcessor,
    PrivacyPageScanner,
    WebDriver,
} from 'scanner-global-library';
import { ConsoleLoggerClient, GlobalLogger } from 'logger';
import { PromiseUtils, ServiceConfiguration } from 'common';
import yargs from 'yargs';
import _ from 'lodash';

type BannerDetectionTestArgs = {
    urlsListPath: string;
    outputPath: string;
};

type BannerDetectionError = {
    url: string;
    error: string | BrowserError;
    pageResponseCode?: number;
};

type BannerDetectionResults = {
    urlsWithBanner: string[];
    urlsWithoutBanner: string[];
    errors: BannerDetectionError[];
};

const serviceConfig = new ServiceConfiguration();
const logger = new GlobalLogger([new ConsoleLoggerClient(serviceConfig, console)], process);
const webDriver = new WebDriver(new PromiseUtils(), logger);
const pageNavigator = new PageNavigator(new PageConfigurator(), new PageResponseProcessor(), new PageHandler(logger));
const privacyPageScanner = new PrivacyPageScanner(serviceConfig);

function getArguments(): BannerDetectionTestArgs {
    yargs.option<keyof BannerDetectionTestArgs, yargs.Options>('urlsListPath', {
        alias: 'p',
        demandOption: true,
        description: 'The path to a file containing a newline-separated list of urls to test',
    });

    yargs.option<keyof BannerDetectionTestArgs, yargs.Options>('outputPath', {
        alias: 'o',
        default: './banner-detection-results.json',
        description: 'The path or filename to store banner detection results (in json format). Defaults to ./banner-detection-results.json',
    });

    yargs.wrap(yargs.terminalWidth()).describe('help', 'Show help');

    return yargs.argv as yargs.Arguments<BannerDetectionTestArgs>;
}

async function validateArguments(args: BannerDetectionTestArgs): Promise<boolean> {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (!fs.existsSync(args.urlsListPath)) {
        logger.logError(`Input file path ${args.urlsListPath} does not exist`);

        return false;
    }
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (fs.existsSync(args.outputPath)) {
        const rl = readline.createInterface(process.stdin, process.stdout);
        const userResponse = await new Promise<string>((resolve) => {
            rl.question(`File ${args.outputPath} already exists. Continue and overwrite the file? (y/n)`, (response) => {
                rl.close();
                resolve(response);
            });
        });

        return userResponse.toLowerCase() === 'y';
    }

    return true;
}

async function openUrl(url: string): Promise<Page> {
    const page = new Page(webDriver, undefined, pageNavigator, logger);
    await page.create();
    await page.navigateToUrl(url);

    return page;
}

function readUrlsList(filename: string): string[] {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const lines = fs.readFileSync(filename).toString().split('\n');

    return lines.map((line) => line.trim()).filter((str) => !_.isEmpty(str));
}

async function scanAllUrls(urls: string[]): Promise<BannerDetectionResults> {
    const results: BannerDetectionResults = {
        urlsWithBanner: [],
        urlsWithoutBanner: [],
        errors: [],
    };

    for (const url of urls) {
        const page = await openUrl(url);
        const privacyScanResult = await privacyPageScanner.scanPageForPrivacy(page);

        if (privacyScanResult.error !== undefined || privacyScanResult.results === undefined) {
            results.errors.push({
                url,
                error: privacyScanResult.error,
                pageResponseCode: privacyScanResult.pageResponseCode,
            });
        } else if (privacyScanResult.results.BannerDetected) {
            results.urlsWithBanner.push(url);
        } else {
            results.urlsWithoutBanner.push(url);
        }

        page.currentPage.close();
    }

    return results;
}

function saveResults(results: BannerDetectionResults, filename: string): void {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.writeFileSync(filename, JSON.stringify(results));
}

(async () => {
    const args = getArguments();
    if (!(await validateArguments(args))) {
        return;
    }

    await logger.setup();

    const urls = readUrlsList(args.urlsListPath);
    logger.logInfo(`Found ${urls.length} URLs in file ${args.urlsListPath}. Beginning privacy scanning...`);

    const results = await scanAllUrls(urls);

    logger.logInfo('Completed banner detection test for all URLs.');
    logger.logInfo(
        `Detected banner on ${results.urlsWithBanner.length} out of ${urls.length} total URLs. ${results.errors.length} URLs failed to scan.`,
    );
    logger.logInfo(`Saving JSON results to ${args.outputPath}`);

    saveResults(results, args.outputPath);

    webDriver.close();
})().catch((e) => logger.logError(e));
