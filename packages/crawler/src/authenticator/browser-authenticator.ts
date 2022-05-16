// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';

export const authenticateBrowser = async (browser: Puppeteer.Browser, accountName: string, accountPass: string): Promise<void> => {
    const page = await browser.newPage();
    await attemptAuthentication(page, accountName, accountPass);
    await page.close();
};

const attemptAuthentication = async (
    page: Puppeteer.Page,
    accountName: string,
    accountPass: string,
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
            console.log('Authentication Failed!');
            return;
        }
        if (errorText !== '') {
            console.log(`Authentication failed with error: ${errorText}`);
        }
        await attemptAuthentication(page, accountName, accountPass, ++attemptNumber);
        return;
    }
    console.log('Authentication Successful');
};
