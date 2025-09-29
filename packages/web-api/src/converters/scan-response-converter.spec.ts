// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import {
    DeepScanResultItem,
    RunState as RunStateRestApi,
    ScanResultResponse,
    ScanRunErrorCodes,
    RunState,
    RunStateClientProvider,
} from 'service-library';
import {
    ItemType,
    OnDemandPageScanResult,
    OnDemandPageScanRunState as RunStateDb,
    WebsiteScanData,
    OnDemandPageScanRunState,
    ScanType,
    KnownPage,
} from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';
import { ScanErrorConverter } from './scan-error-converter';
import { ScanResponseConverter } from './scan-response-converter';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface options {
    dbState?: RunStateDb;
    restApiState?: RunStateRestApi;
    isDeepScanEnabled?: boolean;
    isAuthenticationEnabled?: boolean;
    isPrivacyScan?: boolean;
    isError?: boolean;
    scanType?: ScanType;
}

const apiVersion = '1.0';
const baseUrl = 'https://localhost/api/';
const scanRunError = 'internal-error';
const pageTitle = 'sample page title';
const pageResponseCode = 101;

let scanResponseConverter: ScanResponseConverter;
let scanErrorConverterMock: IMock<ScanErrorConverter>;
let runStateClientProviderMock: IMock<RunStateClientProvider>;
let deepScanResult: DeepScanResultItem[];
let websiteScanData: WebsiteScanData;

beforeEach(() => {
    scanErrorConverterMock = Mock.ofType(ScanErrorConverter);
    runStateClientProviderMock = Mock.ofType<RunStateClientProvider>();
    scanErrorConverterMock
        .setup((o) => o.getScanRunErrorCode(scanRunError))
        .returns(() => ScanRunErrorCodes.internalError)
        .verifiable(Times.once());

    let state: OnDemandPageScanRunState;
    runStateClientProviderMock
        .setup((o) => o.getEffectiveRunState(It.isAny()))
        .callback((r) => (state = r.run.state))
        .returns(() => Promise.resolve(state))
        .verifiable();

    scanResponseConverter = new ScanResponseConverter(scanErrorConverterMock.object, runStateClientProviderMock.object);

    deepScanResult = getDeepScanResult();
    websiteScanData = getWebsiteScanData();
});

describe(ScanResponseConverter, () => {
    it('return completed scan result with error', async () => {
        const pageScanDbResult = getPageScanResult({ dbState: 'completed', isError: true });
        const responseExpected = getScanResultClientResponseFull({ restApiState: 'completed', isError: true });
        const response = await scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult, websiteScanData);
        expect(response).toEqual(responseExpected);
    });

    it('return completed scan result, when deepScan is disabled', async () => {
        const pageScanDbResult = getPageScanResult({ dbState: 'completed' });
        const responseExpected = getScanResultClientResponseFull({ restApiState: 'completed' });
        const response = await scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult, websiteScanData);
        expect(response).toEqual(responseExpected);
    });

    it('return completed scan result with authentication result', async () => {
        const pageScanDbResult = getPageScanResult({ dbState: 'completed', isAuthenticationEnabled: true });
        const responseExpected = getScanResultClientResponseFull({ restApiState: 'completed', isAuthenticationEnabled: true });
        const response = await scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult, websiteScanData);
        expect(response).toEqual(responseExpected);
    });

    it('return completed privacy scan result', async () => {
        const pageScanDbResult = getPageScanResult({ dbState: 'completed', scanType: 'privacy' });
        const responseExpected = getScanResultClientResponseFull({ restApiState: 'completed', scanType: 'privacy' });
        const response = await scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult, websiteScanData);
        expect(response).toEqual(responseExpected);
    });

    test.each(['pending', 'completed', 'failed'])(
        'return completed result, when deepScan is enabled and overall deep scan state = %s',
        async (deepScanOverallState: RunState) => {
            deepScanResult = getDeepScanResult(deepScanOverallState);
            const pageScanDbResult = getPageScanResult({ dbState: 'completed', isDeepScanEnabled: true });
            const responseExpected = getScanResultClientResponseFull({ restApiState: deepScanOverallState, isDeepScanEnabled: true });
            const response = await scanResponseConverter.getScanResultResponse(
                baseUrl,
                apiVersion,
                pageScanDbResult,
                getWebsiteScanData(deepScanOverallState),
            );
            expect(response).toEqual(responseExpected);
        },
    );

    it('create full canonical REST Get Report URL', async () => {
        const pageScanDbResult = getPageScanResult({ dbState: 'completed' });
        const response = await scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult, websiteScanData);
        expect((<any>response).reports[0].links.href).toEqual('https://localhost/api/scans/id/reports/reportIdSarif?api-version=1.0');
    });
});

function getDeepScanResult(deepScanOverallState: RunState = 'pending'): DeepScanResultItem[] {
    const result = [
        {
            scanId: 'scanId1',
            url: 'url1',
            scanRunState: 'pending',
        },
        {
            scanId: 'scanId2',
            url: 'url2',
            scanRunState: 'failed',
        },
        {
            scanId: 'scanId3',
            url: 'url3',
            scanRunState: 'completed',
            scanResultState: 'pass',
        },
    ] as DeepScanResultItem[];
    if (deepScanOverallState === 'failed') {
        result.map((scan) => (scan.scanRunState = 'failed'));
    } else if (deepScanOverallState === 'completed') {
        result.map((scan) => (scan.scanRunState = 'completed'));
        result[0].scanRunState = 'failed';
    }

    return result;
}

function getWebsiteScanData(deepScanOverallState: RunState = 'pending'): WebsiteScanData {
    const result = {
        itemType: ItemType.websiteScanData,
        deepScanId: 'id',
        knownPages: [
            {
                scanId: 'scanId1',
                url: 'url1',
            },
            {
                scanId: 'scanId2',
                url: 'url2',
                runState: 'failed',
            },
            {
                scanId: 'scanId3',
                url: 'url3',
                runState: 'completed',
                scanState: 'pass',
            },
        ],
    } as WebsiteScanData;
    if (deepScanOverallState === 'failed') {
        (result.knownPages as KnownPage[]).map((scan) => (scan.runState = 'failed'));
    } else if (deepScanOverallState === 'completed') {
        (result.knownPages as KnownPage[]).map((scan) => (scan.runState = 'completed'));
        (result.knownPages as KnownPage[])[0].runState = 'failed';
    }

    return result;
}

function getPageScanResult(options: options): OnDemandPageScanResult {
    if (!options.isDeepScanEnabled === true) {
        websiteScanData = undefined;
    }

    return {
        id: 'id',
        deepScanId: options.isDeepScanEnabled ? 'id' : undefined,
        itemType: ItemType.onDemandPageScanRunResult,
        partitionKey: 'partitionKey',
        url: 'url',
        priority: 10,
        scanType: options.scanType ?? 'privacy',
        scanResult: {
            state: 'fail',
            issueCount: 1,
        },
        reports: [
            {
                reportId: 'reportIdSarif',
                format: 'json',
                source: 'privacy-scan',
                href: 'href',
            },
            {
                reportId: 'reportIdHtml',
                format: 'consolidated.json',
                source: 'privacy-scan',
                href: 'href',
            },
        ],
        run: {
            state: options.dbState,
            pageTitle: pageTitle,
            pageResponseCode: pageResponseCode,
            error: options.isError === true ? 'internal-error' : undefined,
            scanRunDetails: [{ name: 'accessibility-agent', state: 'completed' }],
        },
        batchRequestId: 'batch-id',
        ...(options.isAuthenticationEnabled === true
            ? {
                  authentication: {
                      hint: 'entraId',
                      detected: 'entraId',
                      state: 'succeeded',
                  },
              }
            : {}),
    };
}

function getScanResultClientResponseFull(options: options): ScanResultResponse {
    if (!options.isDeepScanEnabled === true) {
        websiteScanData = undefined;
    }

    return {
        scanId: 'id',
        deepScanId: options.isDeepScanEnabled ? 'id' : undefined,
        url: 'url',
        scanType: options.scanType ?? 'privacy',
        scanResult: {
            state: 'fail',
            issueCount: 1,
        },
        reports: [
            {
                reportId: 'reportIdSarif',
                format: 'json',
                source: 'privacy-scan',
                links: {
                    rel: 'self',
                    href: 'https://localhost/api/scans/id/reports/reportIdSarif?api-version=1.0',
                },
            },
            {
                reportId: 'reportIdHtml',
                format: 'consolidated.json',
                source: 'privacy-scan',
                links: {
                    rel: 'self',
                    href: 'https://localhost/api/scans/id/reports/reportIdHtml?api-version=1.0',
                },
            },
        ],
        run: {
            state: options.restApiState,
            pageResponseCode: pageResponseCode,
            pageTitle: pageTitle,
            error: options.isError === true ? ScanRunErrorCodes.internalError : undefined,
            scanRunDetails: [{ name: 'accessibility-agent', state: 'completed' }],
        },
        ...(options.isDeepScanEnabled === true ? { deepScanResult: deepScanResult } : {}),
        ...(options.isAuthenticationEnabled === true
            ? {
                  authentication: {
                      detected: 'entraId',
                      state: 'succeeded',
                  },
              }
            : {}),
    };
}
