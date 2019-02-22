import { createDefaultCosmosClientWrapper } from 'azure-client';
import * as puppeteer from 'puppeteer';
import * as shaJs from 'sha.js';
import { Arguments, argv } from 'yargs';

import { AxePuppeteerFactory } from './axe-puppeteer-factory';
import { BrowserFactory } from './browser/browser-factory';
import { HashIdGenerator } from './hash-id-generator';
import { NodeEntryPoint } from './node-entry-point';
import { ResultConverter } from './result-converter';
import { ScanConfig, ScanTaskRunner } from './scan-task-runner';
import { ScanTaskSteps } from './scan-task-steps';
import { Scanner } from './scanner';

const scanConfig = argv as Arguments<ScanConfig>;

const scanner = new Scanner(new BrowserFactory(puppeteer, new AxePuppeteerFactory()));
const taskSteps = new ScanTaskSteps(
    scanConfig,
    scanner,
    createDefaultCosmosClientWrapper(),
    new ResultConverter(new HashIdGenerator(shaJs)),
);

const scanTaskRunner = new ScanTaskRunner(scanConfig, taskSteps);
const nodeEntryPoint = new NodeEntryPoint(scanTaskRunner, process);

// tslint:disable-next-line: no-floating-promises
nodeEntryPoint.run();
