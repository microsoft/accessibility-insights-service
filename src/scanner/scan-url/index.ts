import { Context } from '@azure/functions';
import * as Puppeteer from 'puppeteer';

import * as shaJs from 'sha.js';
import { AxePuppeteerFactory } from './axe-puppeteer-factory';
import { HashIdGenerator } from './hash-id-generator';
import { IssueFinder } from './issue-finder';
import { ResultConverter } from './result-converter';
import { Scanner } from './scanner';

export async function run(context: Context, url: string): Promise<void> {
    context.log(`starting scan ${url}`);
    const issueFinder: IssueFinder = new IssueFinder(
        new Scanner(Puppeteer, new AxePuppeteerFactory()),
        new ResultConverter(new HashIdGenerator(shaJs('sha256'))),
        context,
    );
    await issueFinder.findIssues(url);
    context.log(`successfully scanned ${url}`);
}
