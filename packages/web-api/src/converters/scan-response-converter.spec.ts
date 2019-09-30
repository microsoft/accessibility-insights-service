// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { WebApiErrorCodes } from 'service-library';
import { ItemType, OnDemandPageScanResult, OnDemandPageScanRunState as RunStateDb } from 'storage-documents';
import { RunState as RunStateRestApi, ScanResultResponse } from '../api-contracts/scan-result-response';
import { ScanResponseConverter } from './scan-response-converter';

// tslint:disable: no-unsafe-any no-any

const apiVersion = '1.0';
const baseUrl = 'https://localhost/api/';
let scanResponseConverter: ScanResponseConverter;

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
            error: state === 'failed' ? WebApiErrorCodes.internalError.response.error : undefined,
        },
    };
}

function validateConverterShortResult(dbState: RunStateDb, clientState: RunStateRestApi): void {
    const pageScanDbResult = getPageScanResult(dbState);
    const responseExpected = getScanResultClientResponseShort(clientState);

    scanResponseConverter = new ScanResponseConverter();
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
    });

    it('return scan run full form of client result', () => {
        const pageScanDbResult = getPageScanResult('completed');
        const responseExpected = getScanResultClientResponseFull('completed');
        scanResponseConverter = new ScanResponseConverter();
        const response = scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult);
        expect(response).toEqual(responseExpected);
    });

    it('create full canonical REST Get Report URL', () => {
        const pageScanDbResult = getPageScanResult('completed');
        scanResponseConverter = new ScanResponseConverter();
        const response = scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult);
        expect((<any>response).reports[0].links.href).toEqual('https://localhost/api/scans/id/reports/reportId?api-version=1.0');
    });
});
