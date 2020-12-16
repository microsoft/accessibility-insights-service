// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import {
    RunState as RunStateRestApi,
    ScanCompletedNotification,
    ScanNotificationErrorCodes,
    ScanResultResponse,
    ScanRunErrorCodes,
    ScanRunResultResponse,
} from 'service-library';
import {
    ItemType,
    OnDemandPageScanResult,
    OnDemandPageScanRunState as RunStateDb,
    ScanCompletedNotification as Notification,
} from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';
import { ScanErrorConverter } from './scan-error-converter';
import { ScanResponseConverter } from './scan-response-converter';

/* eslint-disable @typescript-eslint/no-explicit-any */

const apiVersion = '1.0';
const baseUrl = 'https://localhost/api/';
const scanRunError = 'internal-error';
let scanResponseConverter: ScanResponseConverter;
let scanErrorConverterMock: IMock<ScanErrorConverter>;
const pageTitle = 'sample page title';
const pageResponseCode = 101;
let notificationDb: Notification;
let notificationResponse: ScanCompletedNotification;

beforeEach(() => {
    scanErrorConverterMock = Mock.ofType(ScanErrorConverter);
    scanErrorConverterMock
        .setup((o) => o.getScanRunErrorCode(scanRunError))
        .returns(() => ScanRunErrorCodes.internalError)
        .verifiable(Times.once());

    scanErrorConverterMock
        .setup((o) => o.getScanNotificationErrorCode(It.isAny()))
        .returns(() => ScanNotificationErrorCodes.InternalError)
        .verifiable();

    scanResponseConverter = new ScanResponseConverter(scanErrorConverterMock.object);
    notificationResponse = {
        scanNotifyUrl: 'reply-url',
        state: 'queued',
        error: ScanNotificationErrorCodes.InternalError,
        responseCode: 200,
    };
    notificationDb = {
        scanNotifyUrl: 'reply-url',
        state: 'queued',
        error: {
            errorType: 'InternalError',
            message: 'Failed to send notification.',
        },
        responseCode: 200,
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
                reportId: 'reportIdSarif',
                format: 'sarif',
                href: 'href',
            },
            {
                reportId: 'reportIdHtml',
                format: 'html',
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
        ...(isNotificationEnabled ? { notification: notificationDb } : {}),
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
                reportId: 'reportIdSarif',
                format: 'sarif',
                links: {
                    rel: 'self',
                    href: 'https://localhost/api/scans/id/reports/reportIdSarif?api-version=1.0',
                },
            },
            {
                reportId: 'reportIdHtml',
                format: 'html',
                links: {
                    rel: 'self',
                    href: 'https://localhost/api/scans/id/reports/reportIdHtml?api-version=1.0',
                },
            },
        ],
        run: {
            state: state,
            pageResponseCode: pageResponseCode,
            pageTitle: pageTitle,
        },
        ...(isNotificationEnabled ? { notification: notificationResponse } : {}),
    };
}

function getScanResultClientResponseShort(state: RunStateRestApi, isNotificationEnabled = false): ScanResultResponse {
    const response: ScanRunResultResponse = {
        scanId: 'id',
        url: 'url',
        run: {
            state: state,
            error: state === 'failed' ? ScanRunErrorCodes.internalError : undefined,
        },
        ...(isNotificationEnabled ? { notification: notificationResponse } : {}),
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
    test.each([true, false])('return scan run short form of client result, when notification enabled = %s', (notificationEnabled) => {
        validateConverterShortResult('pending', 'pending', notificationEnabled);
        validateConverterShortResult('accepted', 'accepted', notificationEnabled);
        validateConverterShortResult('queued', 'queued', notificationEnabled);
        validateConverterShortResult('running', 'running', notificationEnabled);
        validateConverterShortResult('failed', 'failed', notificationEnabled);
    });

    test.each([true, false])('return scan run full form of client result, when notification enabled = %s', (notificationEnabled) => {
        const pageScanDbResult = getPageScanResult('completed', notificationEnabled);
        const responseExpected = getScanResultClientResponseFull('completed', notificationEnabled);
        const response = scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult);
        expect(response).toEqual(responseExpected);
    });

    it('adds error to notification if db has error info', () => {
        const pageScanDbResult = getPageScanResult('completed', true);
        const responseExpected: ScanRunResultResponse = getScanResultClientResponseFull('completed', true) as ScanRunResultResponse;

        expect(scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult)).toEqual(responseExpected);
    });

    it('does not add error to notification if db doc has no error', () => {
        const pageScanDbResult = getPageScanResult('completed', true);
        const responseExpected: ScanRunResultResponse = getScanResultClientResponseFull('completed', true) as ScanRunResultResponse;

        pageScanDbResult.notification.error = null;
        const expectedNotificationResponse = responseExpected.notification;
        delete expectedNotificationResponse.error;
        expect(scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult)).toEqual(responseExpected);
    });

    it('create full canonical REST Get Report URL', () => {
        const pageScanDbResult = getPageScanResult('completed');
        const response = scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult);
        expect((<any>response).reports[0].links.href).toEqual('https://localhost/api/scans/id/reports/reportIdSarif?api-version=1.0');
    });
});
