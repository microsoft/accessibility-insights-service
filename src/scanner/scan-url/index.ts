import { Context } from '@azure/functions';
import * as Puppeteer from 'puppeteer';
import { AxePuppeteerFactory } from './AxePuppeteerFactory';

import { ResultConverter } from './result-converter';
import { Scanner } from './scanner';
import * as sha256 from './sha256';

export async function run(context: Context, url: string): Promise<void> {
    await new Scanner(Puppeteer.launch.bind(Puppeteer), new AxePuppeteerFactory(), context, new ResultConverter(sha256)).scan(url);
    context.log(`successfully scanned ${url}`);
}
