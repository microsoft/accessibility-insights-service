// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, Times, It } from 'typemoq';
import { GlobalLogger } from 'logger';
import { AxeScanResults, Page } from 'scanner-global-library';
import { OnDemandPageScanResult, WebsiteScanData } from 'storage-documents';
import { DeepScanner, RunnerScanMetadata } from 'service-library';
import { AxeScanner } from './axe-scanner';
import { HighContrastScanner, HighContrastResults } from './high-contrast-scanner';
import { AgentScanner, AgentResults } from './agent-scanner';
import { ScannerDispatcher } from './scanner-dispatcher';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe(ScannerDispatcher, () => {
    let axeScannerMock: IMock<AxeScanner>;
    let deepScannerMock: IMock<DeepScanner>;
    let highContrastScannerMock: IMock<HighContrastScanner>;
    let agentScannerMock: IMock<AgentScanner>;
    let loggerMock: IMock<GlobalLogger>;
    let scannerDispatcher: ScannerDispatcher;

    const runnerScanMetadataStub: RunnerScanMetadata = {
        id: 'scan-id',
        url: 'https://example.com',
    };

    const pageScanResultStub: OnDemandPageScanResult = {
        id: 'scan-id',
        deepScanId: 'scan-id',
        browserValidationResult: {
            highContrastProperties: 'pending',
        },
        run: {
            scanRunDetails: [
                {
                    name: 'accessibility_agent',
                    state: 'pending',
                },
            ],
        },
    } as OnDemandPageScanResult;

    const websiteScanDataStub: WebsiteScanData = {} as WebsiteScanData;

    const pageMock: IMock<Page> = Mock.ofType<Page>();

    beforeEach(() => {
        axeScannerMock = Mock.ofType<AxeScanner>();
        deepScannerMock = Mock.ofType<DeepScanner>();
        highContrastScannerMock = Mock.ofType<HighContrastScanner>();
        agentScannerMock = Mock.ofType<AgentScanner>();
        loggerMock = Mock.ofType<GlobalLogger>();

        scannerDispatcher = new ScannerDispatcher(
            axeScannerMock.object,
            deepScannerMock.object,
            highContrastScannerMock.object,
            agentScannerMock.object,
            loggerMock.object,
        );
    });

    afterEach(() => {
        axeScannerMock.verifyAll();
        deepScannerMock.verifyAll();
        highContrastScannerMock.verifyAll();
        agentScannerMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('should dispatch all scanners and return results', async () => {
        const axeScanResultsStub = { violations: [] } as AxeScanResults;
        const highContrastResultsStub: HighContrastResults = { result: 'pass' };
        const agentResultsStub: AgentResults = { result: 'pass' };

        axeScannerMock
            .setup((a) => a.scan(pageMock.object))
            .returns(async () => axeScanResultsStub)
            .verifiable(Times.once());
        deepScannerMock.setup((d) => d.runDeepScan(pageScanResultStub, websiteScanDataStub, pageMock.object)).verifiable(Times.once());
        highContrastScannerMock
            .setup((h) => h.scan(runnerScanMetadataStub.url))
            .returns(async () => highContrastResultsStub)
            .verifiable(Times.once());
        agentScannerMock
            .setup((a) => a.scan(runnerScanMetadataStub.url))
            .returns(async () => agentResultsStub)
            .verifiable(Times.once());
        pageMock
            .setup((p) => p.capturePageState())
            .returns(async () => ({ pageScreenshot: 'screenshot-data' }))
            .verifiable(Times.once());
        pageMock.setup((p) => p.close()).verifiable(Times.once());

        const result = await scannerDispatcher.dispatch(runnerScanMetadataStub, pageScanResultStub, websiteScanDataStub, pageMock.object);

        expect(result).toEqual({
            axeScanResults: { violations: [], pageScreenshot: 'screenshot-data' },
            browserValidationResult: { highContrastProperties: 'pass' },
            agentResults: agentResultsStub,
        });
    });

    it('should skip high contrast scan if not pending or error', async () => {
        const modifiedPageScanResult = {
            ...pageScanResultStub,
            browserValidationResult: { highContrastProperties: 'pass' },
        };

        const result = await (scannerDispatcher as any).dispatchHighContrastScan(runnerScanMetadataStub, modifiedPageScanResult);

        expect(result).toBeUndefined();
        highContrastScannerMock.verify((h) => h.scan(It.isAny()), Times.never());
    });

    it('should skip agent scan if not pending or error', async () => {
        const modifiedPageScanResult = {
            ...pageScanResultStub,
            run: {
                scanRunDetails: [
                    {
                        name: 'accessibility_agent',
                        state: 'completed',
                    },
                ],
            },
        };

        const result = await (scannerDispatcher as any).dispatchAgentScan(runnerScanMetadataStub, modifiedPageScanResult);

        expect(result).toBeUndefined();
        agentScannerMock.verify((a) => a.scan(It.isAny()), Times.never());
    });
});
