import { Context } from '@azure/functions';
import * as Puppeteer from 'puppeteer';

import { AxePuppeteerFactory } from './AxePuppeteerFactory';
import { Scanner } from './scanner';

export async function run(context: Context, url: string): Promise<void> {
    context.log(`starting scan ${url}`);
    await new Scanner(Puppeteer.launch.bind(Puppeteer), new AxePuppeteerFactory(), context).scan(url);
    context.log(`successfully scanned ${url}`);
}
