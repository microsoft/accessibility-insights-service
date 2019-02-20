import * as puppeteer from 'puppeteer';
import { Arguments, argv } from 'yargs';

import { AxePuppeteerFactory } from './axe-puppeteer-factory';
import { BrowserFactory } from './browser/browser-factory';
import { runTask, ScanConfig } from './run-task';
import { Scanner } from './scanner';

const scannerConfig = argv as Arguments<ScanConfig>;

const scanner = new Scanner(new BrowserFactory(puppeteer, scannerConfig.chromePath, new AxePuppeteerFactory()));

// tslint:disable-next-line: no-floating-promises
runTask(scannerConfig, scanner, process);
