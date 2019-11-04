// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { RunState as RunStateRestApi, ScanResultResponse, ScanRunErrorCodes } from 'service-library';
import { ItemType, OnDemandPageScanResult, OnDemandPageScanRunState as RunStateDb } from 'storage-documents';
import { IMock, Mock, Times } from 'typemoq';

import { ScanResponseConverter } from './scan-response-converter';
import { ScanRunErrorConverter } from './scan-run-error-converter';

// tslint:disable: no-unsafe-any no-any

const apiVersion = '1.0';
const baseUrl = 'https://localhost/api/';
const scanRunError = 'internal-error';
let scanResponseConverter: ScanResponseConverter;
let scanRunErrorConverterMock: IMock<ScanRunErrorConverter>;

beforeEach(() => {
    scanRunErrorConverterMock = Mock.ofType(ScanRunErrorConverter);
    scanRunErrorConverterMock
        .setup(o => o.getScanRunErrorCode(scanRunError))
        .returns(() => ScanRunErrorCodes.internalError)
        .verifiable(Times.once());

    scanResponseConverter = new ScanResponseConverter(scanRunErrorConverterMock.object);
});

function getPageScanResult(state: RunStateDb): OnDemandPageScanResult {
    return {
        id: 'id',
        itemType: ItemType.onDemandPageScanRunResult,
        partitionKey: 'partitionKey',
        url: 'url',
        priority: 10,
        scanResult: {
            state: 'fail',
            issueCount: 1,
        },
        reports: [
            {
                reportId: 'reportId',
                format: 'sarif',
                href: 'href',
            },
        ],
        run: {
            state: state,
            error: 'internal-error',
        },
        batchRequestId: 'batch-id',
    };
}

function getScanResultClientResponseFull(state: RunStateRestApi): ScanResultResponse {
    return {
        scanId: 'id',
        url: 'url',
        scanResult: {
            state: 'fail',
            issueCount: 1,
        },
        reports: [
            {
                reportId: 'reportId',
                format: 'sarif',
                links: {
                    rel: 'self',
                    href: 'https://localhost/api/scans/id/reports/reportId?api-version=1.0',
                },
            },
        ],
        run: {
            state: state,
        },
    };
}

function getScanResultClientResponseShort(state: RunStateRestApi): ScanResultResponse {
    return {
        scanId: 'id',
        url: 'url',
        run: {
            state: state,
            error: state === 'failed' ? ScanRunErrorCodes.internalError : undefined,
        },
    };
}

function validateConverterShortResult(dbState: RunStateDb, clientState: RunStateRestApi): void {
    const pageScanDbResult = getPageScanResult(dbState);
    const responseExpected = getScanResultClientResponseShort(clientState);

    const response = scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult);

    expect(response).toEqual(responseExpected);
}

describe(ScanResponseConverter, () => {
    it('return scan run short form of client result', () => {
        validateConverterShortResult('pending', 'pending');
        validateConverterShortResult('accepted', 'accepted');
        validateConverterShortResult('queued', 'queued');
        validateConverterShortResult('running', 'running');
        validateConverterShortResult('failed', 'failed');
        scanRunErrorConverterMock.verifyAll();
    });

    it('return scan run full form of client result', () => {
        const pageScanDbResult = getPageScanResult('completed');
        const responseExpected = getScanResultClientResponseFull('completed');
        const response = scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult);
        expect(response).toEqual(responseExpected);
    });

    it('create full canonical REST Get Report URL', () => {
        const pageScanDbResult = getPageScanResult('completed');
        const response = scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult);
        expect((<any>response).reports[0].links.href).toEqual('https://localhost/api/scans/id/reports/reportId?api-version=1.0');
    });
});
