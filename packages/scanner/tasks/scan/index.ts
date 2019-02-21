import * as puppeteer from 'puppeteer';
import * as shaJs from 'sha.js';
import { Arguments, argv } from 'yargs';

import { createDefaultCosmosClientWrapper } from 'azure-client';
import { AxePuppeteerFactory } from './axe-puppeteer-factory';
import { BrowserFactory } from './browser/browser-factory';
import { HashIdGenerator } from './hash-id-generator';
import { ResultConverter } from './result-converter';
import { runTask, ScanConfig } from './run-task';
import { Scanner } from './scanner';
import { TaskSteps } from './task-steps';

const scanConfig = argv as Arguments<ScanConfig>;

const scanner = new Scanner(new BrowserFactory(puppeteer, new AxePuppeteerFactory()));
const taskSteps = new TaskSteps(scanConfig, scanner, createDefaultCosmosClientWrapper(), new ResultConverter(new HashIdGenerator(shaJs)));

// tslint:disable-next-line: no-floating-promises
runTask(scanConfig, taskSteps, process);
