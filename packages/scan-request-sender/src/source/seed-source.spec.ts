// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { CosmosOperationResponse, StorageClient } from 'azure-services';
import { Logger } from 'logger';
import { IMock, Mock, Times } from 'typemoq';
// tslint:disable: no-unsafe-any
import { ScanRequest, WebSite } from '../request-type/website';
import { SeedSource } from './seed-source';

describe('Scan Source', () => {
    let testSubject: SeedSource;
    let storageClientMock: IMock<StorageClient>;
    let loggerMock: IMock<Logger>;

    beforeEach(() => {
        storageClientMock = Mock.ofType<StorageClient>();
        storageClientMock
            .setup(async o => o.readAllDocument<ScanRequest>())
            .returns(async () => Promise.resolve(getScanRequestTestData()))
            .verifiable(Times.once());
        loggerMock = Mock.ofType(Logger);
        testSubject = new SeedSource(storageClientMock.object, loggerMock.object);
    });
    it('get websites to scan', async () => {
        const websites: WebSite[] = await testSubject.getWebSites();
        expect(websites.length).toEqual(1);
    });

    function getScanRequestTestData(): CosmosOperationResponse<ScanRequest[]> {
        // tslint:disable-next-line: no-object-literal-type-assertion
        return <CosmosOperationResponse<ScanRequest[]>>{
            type: 'CosmosOperationResponse<ScanRequest>',
            statusCode: 200,
            item: <ScanRequest[]>[
                {
                    id: 'test1',
                    count: 1,
                    websites: [
                        {
                            id: 'website1',
                            name: 'Test web site',
                            baseUrl: 'https://www.microsoft.com',
                            scanUrl: 'https://www.microsoft.com',
                            serviceTreeId: '123',
                        },
                    ],
                },
            ],
        };
    }
});
