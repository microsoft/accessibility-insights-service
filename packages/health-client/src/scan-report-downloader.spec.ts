// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from 'logger';
import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import { A11yServiceClient } from 'web-api-client';
import { ensureDirectory, ResponseWithBodyType } from 'common';
import { ScanReport, ScanResultResponse, ScanRunErrorResponse, ScanRunResultResponse } from 'service-library';
import { ScanReportDownloader } from './scan-report-downloader';

describe(ScanReportDownloader, () => {
    let loggerMock: IMock<Logger>;
    let a11yServiceClientMock: IMock<A11yServiceClient>;
    let fsMock: IMock<typeof fs>;
    let ensureDirectoryMock: IMock<typeof ensureDirectory>;
    const downloadLocation = 'download-dir';
    const scanId = 'scan-id';
    const fileNameBase = 'filename';
    const reports = [
        {
            reportId: 'reportId1',
            format: 'html',
        },
        {
            reportId: 'reportId2',
            format: 'sarif',
        },
    ] as ScanReport[];

    let testSubject: ScanReportDownloader;

    beforeEach(() => {
        loggerMock = Mock.ofType<Logger>();
        a11yServiceClientMock = Mock.ofType<A11yServiceClient>();
        fsMock = Mock.ofInstance(fs, MockBehavior.Strict);
        ensureDirectoryMock = Mock.ofInstance(ensureDirectory);
        ensureDirectoryMock
            .setup((ed) => ed(downloadLocation))
            .returns(() => downloadLocation)
            .verifiable();

        testSubject = new ScanReportDownloader(
            a11yServiceClientMock.object,
            downloadLocation,
            loggerMock.object,
            fsMock.object,
            ensureDirectoryMock.object,
        );
    });

    afterEach(() => {
        a11yServiceClientMock.verifyAll();
        loggerMock.verifyAll();
        fsMock.verifyAll();
        ensureDirectoryMock.verifyAll();
    });

    it.each([199, 300])('Does nothing if getScanStatus returns status code %s', async (statusCode) => {
        const response = { statusCode } as ResponseWithBodyType<ScanResultResponse>;
        a11yServiceClientMock
            .setup((a) => a.getScanStatus(scanId))
            .returns(async () => response)
            .verifiable();

        await testSubject.downloadReportsForScan(scanId, fileNameBase);
    });

    it('Does nothing if getScanStatus returns error response', async () => {
        const response = {
            body: {
                error: {},
            },
        } as ResponseWithBodyType<ScanRunErrorResponse>;
        a11yServiceClientMock
            .setup((a) => a.getScanStatus(scanId))
            .returns(async () => response)
            .verifiable();

        await testSubject.downloadReportsForScan(scanId, fileNameBase);
    });

    it('Does nothing if getScanStatus returns no reports in body', async () => {
        const response = {
            statusCode: 200,
            body: {
                reports: [],
            },
        } as ResponseWithBodyType<ScanRunResultResponse>;
        a11yServiceClientMock
            .setup((a) => a.getScanStatus(scanId))
            .returns(async () => response)
            .verifiable();

        await testSubject.downloadReportsForScan(scanId, fileNameBase);
    });

    it('Downloads all reports', async () => {
        const scanStatusResponse = {
            statusCode: 200,
            body: {
                reports: reports,
            },
        } as ResponseWithBodyType<ScanRunResultResponse>;
        a11yServiceClientMock.setup((a) => a.getScanStatus(scanId)).returns(async () => scanStatusResponse);
        reports.forEach((report) => {
            const reportContent = Buffer.from('report content');
            const reportResponse = {
                statusCode: 200,
                body: reportContent,
            } as ResponseWithBodyType<Buffer>;
            const filePath = path.join(downloadLocation, `${fileNameBase}.${report.format}`);

            a11yServiceClientMock
                .setup((a) => a.getScanReport(scanId, report.reportId))
                .returns(async () => reportResponse)
                .verifiable();
            fsMock.setup((f) => f.writeFileSync(filePath, reportContent)).verifiable();
        });

        await testSubject.downloadReportsForScan(scanId, fileNameBase);
    });

    it('Handles error response from report endpoint', async () => {
        const scanStatusResponse = {
            statusCode: 200,
            body: {
                reports: reports,
            },
        } as ResponseWithBodyType<ScanRunResultResponse>;
        const reportContent = Buffer.from('report content');
        const failedReportResponse = {
            statusCode: 404,
        } as ResponseWithBodyType<Buffer>;
        const successfulReportResponse = {
            statusCode: 200,
            body: reportContent,
        } as ResponseWithBodyType<Buffer>;
        const filePath = path.join(downloadLocation, `${fileNameBase}.${reports[1].format}`);

        a11yServiceClientMock.setup((a) => a.getScanStatus(scanId)).returns(async () => scanStatusResponse);
        a11yServiceClientMock
            .setup((a) => a.getScanReport(scanId, reports[0].reportId))
            .returns(async () => failedReportResponse)
            .verifiable();
        a11yServiceClientMock
            .setup((a) => a.getScanReport(scanId, reports[1].reportId))
            .returns(async () => successfulReportResponse)
            .verifiable();
        fsMock.setup((f) => f.writeFileSync(filePath, reportContent)).verifiable(Times.once());

        await testSubject.downloadReportsForScan(scanId, fileNameBase);
    });
});
