// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { RunState as RunStateRestApi, ScanResultResponse, ScanRunErrorCodes } from 'service-library';
import {
    ItemType,
    OnDemandPageScanResult,
    OnDemandPageScanRunState as RunStateDb,
    ScanCompletedNotification,
    ScanCompletedNotificationResponse,
} from 'storage-documents';
import { IMock, Mock, Times } from 'typemoq';

import { ScanResponseConverter } from './scan-response-converter';
import { ScanRunErrorConverter } from './scan-run-error-converter';

// tslint:disable: no-unsafe-any no-any

const apiVersion = '1.0';
const baseUrl = 'https://localhost/api/';
const scanRunError = 'internal-error';
let scanResponseConverter: ScanResponseConverter;
let scanRunErrorConverterMock: IMock<ScanRunErrorConverter>;
const pageTitle = 'sample page title';
const pageResponseCode = 101;
let notification: ScanCompletedNotificationResponse;

beforeEach(() => {
    scanRunErrorConverterMock = Mock.ofType(ScanRunErrorConverter);
    scanRunErrorConverterMock
        .setup(o => o.getScanRunErrorCode(scanRunError))
        .returns(() => ScanRunErrorCodes.internalError)
        .verifiable(Times.once());

    scanResponseConverter = new ScanResponseConverter(scanRunErrorConverterMock.object);
    notification = {
        scanNotifyUrl: 'reply-url',
        state: 'queued',
        error: {
            errorType: 'HttpErrorCode',
            message: 'Failed to send notification.',
        },
    };
});

function getPageScanResult(state: RunStateDb, isNotificationEnabled = false): OnDemandPageScanResult {
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
            pageTitle: pageTitle,
            pageResponseCode: pageResponseCode,
        },
        batchRequestId: 'batch-id',
        ...(isNotificationEnabled ? { notification } : {}),
    };
}

function getScanResultClientResponseFull(state: RunStateRestApi, isNotificationEnabled = false): ScanResultResponse {
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
            pageResponseCode: pageResponseCode,
            pageTitle: pageTitle,
        },
        ...(isNotificationEnabled ? { notification } : {}),
    };
}

function getScanResultClientResponseShort(state: RunStateRestApi, isNotificationEnabled = false): ScanResultResponse {
    const response: ScanResultResponse = {
        scanId: 'id',
        url: 'url',
        run: {
            state: state,
            error: state === 'failed' ? ScanRunErrorCodes.internalError : undefined,
        },
        ...(isNotificationEnabled ? { notification } : {}),
    };

    if (state === 'completed' || state === 'failed') {
        response.run.pageResponseCode = pageResponseCode;
        response.run.pageTitle = pageTitle;
    }

    return response;
}

function validateConverterShortResult(dbState: RunStateDb, clientState: RunStateRestApi, isNotificationEnabled = false): void {
    const pageScanDbResult = getPageScanResult(dbState, isNotificationEnabled);
    const responseExpected = getScanResultClientResponseShort(clientState, isNotificationEnabled);

    const response = scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult);

    expect(response).toEqual(responseExpected);
}

describe(ScanResponseConverter, () => {
    test.each([true, false])('return scan run short form of client result, when notification enabled = %s', notificationEnabled => {
        validateConverterShortResult('pending', 'pending', notificationEnabled);
        validateConverterShortResult('accepted', 'accepted', notificationEnabled);
        validateConverterShortResult('queued', 'queued', notificationEnabled);
        validateConverterShortResult('running', 'running', notificationEnabled);
        validateConverterShortResult('failed', 'failed', notificationEnabled);
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
