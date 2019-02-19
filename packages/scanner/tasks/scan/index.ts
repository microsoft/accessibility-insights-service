import * as puppeteer from 'puppeteer';
import { Arguments, argv } from 'yargs';

import { AxePuppeteerFactory } from './axe-puppeteer-factory';
import { BrowserFactory } from './browser/browser-factory';
import { invokeScan, ScanConfig } from './invoke-scan';
import { Scanner } from './scanner';

const scanner = new Scanner(new BrowserFactory(puppeteer, new AxePuppeteerFactory()));

// tslint:disable-next-line: no-floating-promises
invokeScan(argv as Arguments<ScanConfig>, scanner);
