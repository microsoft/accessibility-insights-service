// tslint:disable: no-import-side-effect
import 'reflect-metadata';

import '../node';

import { IMock, Mock, Times } from 'typemoq';
import { HashGenerator } from '../common/hash-generator';
import { ScanMetadata } from '../common/scan-metadata';
import { RunState, ScanLevel } from '../documents/states';
import { WebsiteScanState } from '../documents/website';
import { WebsiteFactory } from './website-factory';

describe('WebsiteFactory', () => {
    let hashGeneratorMock: IMock<HashGenerator>;
    let websiteFactory: WebsiteFactory;
    const scanMetadata: ScanMetadata = {
        websiteId: 'websiteId',
        websiteName: 'websiteName',
        baseUrl: 'scanMetadata-baseUrl',
        scanUrl: 'scanMetadata-scanUrl',
        serviceTreeId: 'serviceTreeId',
    };

    beforeEach(() => {
        hashGeneratorMock = Mock.ofType<HashGenerator>();
        hashGeneratorMock
            .setup(b => b.generateBase64Hash(scanMetadata.baseUrl))
            .returns(() => 'baseUrl-hash-1')
            .verifiable(Times.once());
        websiteFactory = new WebsiteFactory(hashGeneratorMock.object);
    });

    it('create new without page result', () => {
        const runTime = new Date();
        const pageScanResult = {
            id: 'pageScanId',
            websiteId: 'websiteId',
            url: 'pageUrl',
            crawl: {
                run: {
                    runTime: runTime.toJSON(),
                    state: RunState.completed,
                },
            },
            scan: {
                run: {
                    runTime: runTime.toJSON(),
                    state: RunState.failed,
                },
            },
        };

        const expectedResult = {
            id: 'baseUrl-hash-1',
            websiteId: scanMetadata.websiteId,
            name: scanMetadata.websiteName,
            baseUrl: scanMetadata.baseUrl,
            serviceTreeId: scanMetadata.serviceTreeId,
            scanResult: { lastUpdated: runTime.toJSON(), scanState: WebsiteScanState.completedWithError },
            lastPageScans: [
                {
                    id: pageScanResult.id,
                    url: pageScanResult.url,
                    lastUpdated: runTime.toJSON(),
                    runState: pageScanResult.scan.run.state,
                },
            ],
        };

        const result = websiteFactory.create(pageScanResult, scanMetadata, runTime);

        expect(result).toEqual(expectedResult);
        hashGeneratorMock.verifyAll();
    });

    it('create new with page result', () => {
        const runTime = new Date();
        const pageScanResult = {
            id: 'pageScanId',
            websiteId: 'websiteId',
            url: 'pageUrl',
            crawl: {
                run: {
                    runTime: runTime.toJSON(),
                    state: RunState.completed,
                },
            },
            scan: {
                result: {
                    runTime: runTime.toJSON(),
                    level: ScanLevel.pass,
                    issues: <string[]>[],
                },
                run: {
                    runTime: runTime.toJSON(),
                    state: RunState.completed,
                },
            },
        };

        const expectedResult = {
            id: 'baseUrl-hash-1',
            websiteId: scanMetadata.websiteId,
            name: scanMetadata.websiteName,
            baseUrl: scanMetadata.baseUrl,
            serviceTreeId: scanMetadata.serviceTreeId,
            scanResult: { lastUpdated: runTime.toJSON(), level: ScanLevel.pass, scanState: WebsiteScanState.completed },
            lastPageScans: [
                {
                    id: pageScanResult.id,
                    url: pageScanResult.url,
                    lastUpdated: runTime.toJSON(),
                    level: pageScanResult.scan.result.level,
                    runState: pageScanResult.scan.run.state,
                },
            ],
        };

        const result = websiteFactory.create(pageScanResult, scanMetadata, runTime);

        expect(result).toEqual(expectedResult);
        hashGeneratorMock.verifyAll();
    });
});
