// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { IMock, Mock, It } from 'typemoq';
import { DbScanResultReader, ScanResult, ScanMetadata } from 'accessibility-insights-crawler';
import { AxeResultsReducer, CombinedReportDataConverter, AxeCoreResults, ScanResultData, UrlCount } from 'axe-result-converter';
import { ReporterFactory, CombinedReportParameters, Reporter, Report } from 'accessibility-insights-report';
import { AxeInfo } from '../tool-data/axe-info';
import { ConsolidatedReportGenerator } from './consolidated-report-generator';
import { serviceName } from './report-formats';

const axeCoreVersion = 'axe core version';
const htmlReportString = 'html report';
const scanStarted = new Date(1000);
const scanEnded = new Date(60000);

let dbScanResultReaderMock: IMock<DbScanResultReader>;
let axeResultsReducerMock: IMock<AxeResultsReducer>;
let combinedReportDataConverterMock: IMock<CombinedReportDataConverter>;
let reporterMock: IMock<Reporter>;
let axeInfoMock: IMock<AxeInfo>;
let consolidatedReportGenerator: ConsolidatedReportGenerator;
let htmlReport: Report;
let combinedReportData: CombinedReportParameters;

describe(ConsolidatedReportGenerator, () => {
    beforeEach(() => {
        dbScanResultReaderMock = Mock.ofType<DbScanResultReader>();
        axeResultsReducerMock = Mock.ofType<AxeResultsReducer>();
        combinedReportDataConverterMock = Mock.ofType<CombinedReportDataConverter>();
        axeInfoMock = Mock.ofType<AxeInfo>();
        reporterMock = Mock.ofType<Reporter>();

        axeInfoMock
            .setup((o) => o.version)
            .returns(() => axeCoreVersion)
            .verifiable();

        htmlReport = {
            asHTML: () => htmlReportString,
        };
        const reporterFactoryMock: ReporterFactory = () => reporterMock.object;
        combinedReportData = { serviceName: 'combinedReportData' } as CombinedReportParameters;
        reporterMock
            .setup((o) => o.fromCombinedResults(combinedReportData))
            .returns(() => htmlReport)
            .verifiable();

        consolidatedReportGenerator = new ConsolidatedReportGenerator(
            () => dbScanResultReaderMock.object,
            axeResultsReducerMock.object,
            combinedReportDataConverterMock.object,
            reporterFactoryMock,
            axeInfoMock.object,
        );
    });

    afterEach(() => {
        axeResultsReducerMock.verifyAll();
        combinedReportDataConverterMock.verifyAll();
        reporterMock.verifyAll();
        axeInfoMock.verifyAll();
    });

    it('generate report', async () => {
        const baseUrl = 'baseUrl-1';
        const scanMetadata = {
            baseUrl,
            basePageTitle: 'basePageTitle',
            userAgent: 'userAgent',
        } as ScanMetadata;
        const combinedAxeResults = { violations: [], passes: [], incomplete: [], inapplicable: [] } as AxeCoreResults;
        const scanResults = [
            {
                id: 'id-1',
                scanState: 'pass',
                axeResults: { url: 'url-1' },
            },
            {
                id: 'id-2',
                scanState: 'fail',
                axeResults: { url: 'url-2' },
            },
            {
                id: 'id-3',
                scanState: 'pass',
                axeResults: { url: 'url-3' },
            },
            {
                id: 'id-4',
                scanState: 'runError',
            },
        ] as ScanResult[];
        const urlCount = getUrlCount(scanResults);
        const scanResultData: ScanResultData = {
            baseUrl: scanMetadata.baseUrl,
            basePageTitle: scanMetadata.basePageTitle,
            scanEngineName: serviceName,
            axeCoreVersion: axeCoreVersion,
            browserUserAgent: scanMetadata.userAgent,
            urlCount,
            scanStarted,
            scanEnded,
        };

        for (let index = 0; index <= scanResults.length; index++) {
            const next = index === scanResults.length ? { done: true, value: undefined } : { done: false, value: scanResults[index] };
            dbScanResultReaderMock
                .setup(async (o) => o.next())
                .returns(() => Promise.resolve(next))
                .verifiable();
            if (next.done === false && scanResults[index].axeResults !== undefined) {
                axeResultsReducerMock
                    .setup((o) => o.reduce(It.isValue(combinedAxeResults), It.isValue(scanResults[index].axeResults)))
                    .verifiable();
            }
        }

        dbScanResultReaderMock
            .setup(async (o) => o.getScanMetadata(baseUrl))
            .returns(() => Promise.resolve(scanMetadata))
            .verifiable();
        dbScanResultReaderMock.setup((o) => o[Symbol.asyncIterator]).returns(() => () => dbScanResultReaderMock.object);
        combinedReportDataConverterMock
            .setup((o) => o.convert(combinedAxeResults, scanResultData))
            .returns(() => combinedReportData)
            .verifiable();

        await consolidatedReportGenerator.generateReport(baseUrl, scanStarted, scanEnded);
    });
});

function getUrlCount(scanResults: ScanResult[]): UrlCount {
    const urlCount = {
        total: scanResults.length,
        failed: 0,
        passed: 0,
    };

    for (const scanResult of scanResults) {
        if (scanResult.scanState === 'pass') {
            urlCount.passed++;
        } else if (scanResult.scanState === 'fail') {
            urlCount.failed++;
        }
    }

    return urlCount;
}
