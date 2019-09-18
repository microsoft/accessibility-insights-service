// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-object-literal-type-assertion no-unsafe-any
import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { Logger } from 'logger';
import { Browser } from 'puppeteer';
import { AxeScanResults } from 'scanner';
import { OnDemandPageScanRunResultProvider } from 'service-library';
import { ItemType, OnDemandPageScanResult, OnDemandPageScanRunState, ReportFormat, ScanState } from 'storage-documents';
import { IMock, Mock, Times } from 'typemoq';
import { ScanMetadataConfig } from '../scan-metadata-config';
import { ScannerTask } from '../tasks/scanner-task';
import { WebDriverTask } from '../tasks/web-driver-task';
import { ScanMetadata } from '../types/scan-metadata';
import { Runner } from './runner';

let runner: Runner;
let browser: Browser;
let webDriverTaskMock: IMock<WebDriverTask>;
let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
let scannerTaskMock: IMock<ScannerTask>;
let scanMetadataConfig: IMock<ScanMetadataConfig>;
let loggerMock: IMock<Logger>;

const scanMetadata: ScanMetadata = {
    id: 'id',
    url: 'url',
    priority: 1,
};

// tslint:disable-next-line:mocha-no-side-effect-code
const onDemandPageScanResult: OnDemandPageScanResult = {
    url: 'url',
    scanResult: {
        state: 'pass' as ScanState,
        issueCount: undefined,
    },
    reports: [
        {
            reportId: '',
            format: 'sarif' as ReportFormat,
            href: '',
        },
    ],
    run: {
        state: 'running' as OnDemandPageScanRunState,
        timestamp: 'timestamp',
        error: '',
    },
    priority: 1,
    itemType: ItemType.onDemandPageScanRunResult,
    id: 'id',
    partitionKey: 'item-partitionKey',
};

// tslint:disable-next-line: mocha-no-side-effect-code
const axeScanResults: AxeScanResults = {
    results: {
        url: 'url',
        timestamp: 'timestamp',
        passes: [
            {
                id: 'id',
                impact: 'minor',
                description: 'description',
                help: 'help',
                helpUrl: 'helpUrl',
                tags: [],
                nodes: [
                    {
                        html: 'html',
                        impact: 'minor',
                        target: ['target'],
                        any: [],
                        all: [],
                        none: [],
                    },
                ],
            },
        ],
        violations: [],
        incomplete: [],
        inapplicable: [],
    } as AxeResults,
};

beforeEach(() => {
    browser = <Browser>{};
    webDriverTaskMock = Mock.ofType<WebDriverTask>();
    loggerMock = Mock.ofType(Logger);
    onDemandPageScanRunResultProviderMock = Mock.ofType(OnDemandPageScanRunResultProvider);
    scanMetadataConfig = Mock.ofType(ScanMetadataConfig);
    scannerTaskMock = Mock.ofType<ScannerTask>();
    scanMetadataConfig.setup(s => s.getConfig()).returns(() => scanMetadata);
});

describe('runner', () => {
    it('run scan workflow', async () => {
        webDriverTaskMock
            .setup(async o => o.launch())
            .returns(async () => Promise.resolve(browser))
            .verifiable(Times.once());

        webDriverTaskMock
            .setup(async o => o.close())
            .returns(async () => Promise.resolve())
            .verifiable(Times.once());

        onDemandPageScanRunResultProviderMock
            .setup(async o => o.readScanRuns(['id']))
            .returns(async () => Promise.resolve([onDemandPageScanResult]))
            .verifiable(Times.atLeastOnce());

        onDemandPageScanRunResultProviderMock
            .setup(async o => o.updateScanRun(onDemandPageScanResult))
            .returns(async () => Promise.resolve())
            .verifiable(Times.never());

        scannerTaskMock
            .setup(async o => o.scan(scanMetadata.url))
            .returns(async () => Promise.resolve(axeScanResults))
            .verifiable(Times.once());

        runner = new Runner(
            scanMetadataConfig.object,
            scannerTaskMock.object,
            onDemandPageScanRunResultProviderMock.object,
            webDriverTaskMock.object,
            loggerMock.object,
        );

        await runner.run();

        scannerTaskMock.verifyAll();
        webDriverTaskMock.verifyAll();
        onDemandPageScanRunResultProviderMock.verifyAll();
    });
});
