import { Context } from '@azure/functions';
import * as Puppeteer from 'puppeteer';
import { AxePuppeteerUtils } from './AxePuppeteerUtils';

import { Scanner } from './scanner';

export async function run(context: Context, url: string): Promise<void> {
    await new Scanner(Puppeteer.launch.bind(Puppeteer), new AxePuppeteerUtils()).scan(url);
    context.log(`successfully scanned ${url}`);
}
