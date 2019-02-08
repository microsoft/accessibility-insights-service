import { Context } from '@azure/functions';
import * as appInsights from 'applicationinsights';
import * as Puppeteer from 'puppeteer';
import * as shaJs from 'sha.js';

import { createTelemetryClient } from '../common/create-telemetry-client';
import { ScanRequest } from '../common/data-contract';
import { AxePuppeteerFactory } from './axe-puppeteer-factory';
import { HashIdGenerator } from './hash-id-generator';
import { IssueFinder } from './issue-finder';
import { ResultConverter } from './result-converter';
import { Scanner } from './scanner';

export async function run(context: Context, scanRequest: ScanRequest): Promise<void> {
    createTelemetryClient(context, appInsights);

    context.log('starting scan-', scanRequest);
    const issueFinder: IssueFinder = new IssueFinder(
        new Scanner(Puppeteer, new AxePuppeteerFactory()),
        new ResultConverter(new HashIdGenerator(shaJs('sha256'))),
        context,
    );
    await issueFinder.findIssues(scanRequest);
    context.log('successfully scanned-', scanRequest);
}
