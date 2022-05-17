// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import Apify from 'apify';
const { log: apifyLog } = Apify.utils;
import * as Puppeteer from 'puppeteer';

const attemptAuthentication = async (
    page: Puppeteer.Page,
    accountName: string,
    accountPass: string,
    logger: typeof apifyLog,
    attemptNumber: number = 1,
): Promise<void> => {
    await page.goto('https://portal.azure.com');
    await page.waitForSelector('input[name="loginfmt"]');
    await page.type('input[name="loginfmt"]', accountName);
    await page.keyboard.press('Enter');
    await page.waitForSelector('#FormsAuthentication');
    await page.click('#FormsAuthentication');
    await page.type('input[type="password"]', accountPass);

    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    if (!page.url().match('^https://ms.portal.azure.com')) {
        const errorText: string = await page.$eval('#errorText', (el) => el.textContent);
        if (attemptNumber > 4) {
            logger.error('Attempted authentication 5 times and ultimately failed.');

            return;
        }
        if (errorText !== '') {
            logger.warning(`Authentication failed with error: ${errorText}`);
        }
        await attemptAuthentication(page, accountName, accountPass, logger, attemptNumber + 1);

        return;
    }
    logger.info('Authentication succeeded');
};

export const authenticateBrowser = async (
    browser: Puppeteer.Browser,
    accountName: string,
    accountPass: string,
    logger: typeof apifyLog,
): Promise<void> => {
    const page = await browser.newPage();
    await attemptAuthentication(page, accountName, accountPass, logger);
    await page.close();
};
