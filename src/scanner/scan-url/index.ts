import { Context } from '@azure/functions';
import * as Puppeteer from 'puppeteer';

import * as shaJs from 'sha.js';
import { ResultConverter } from './result-converter';
import { AxePuppeteerFactory } from './AxePuppeteerFactory';
import { Scanner } from './scanner';

export async function run(context: Context, url: string): Promise<void> {
    context.log(`starting scan ${url}`);
    await new Scanner(Puppeteer, new AxePuppeteerFactory(), context, new ResultConverter(shaJs('sha256'))).scan(url);
    context.log(`successfully scanned ${url}`);
}
