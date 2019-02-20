import * as puppeteer from 'puppeteer';
import { Arguments, argv } from 'yargs';

import { AxePuppeteerFactory } from './axe-puppeteer-factory';
import { BrowserFactory } from './browser/browser-factory';
import { runTask, ScanConfig } from './run-task';
import { Scanner } from './scanner';

const scanner = new Scanner(new BrowserFactory(puppeteer, new AxePuppeteerFactory()));

// tslint:disable-next-line: no-floating-promises
runTask(argv as Arguments<ScanConfig>, scanner, process);
