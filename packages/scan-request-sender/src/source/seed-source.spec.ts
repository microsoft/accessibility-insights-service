// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { CosmosContainerClient, CosmosOperationResponse } from 'azure-services';
import { Logger } from 'logger';
import { IMock, Mock, Times } from 'typemoq';
import { ScanRequest, WebSite } from '../request-type/website';
import { SeedSource } from './seed-source';

// tslint:disable: no-unsafe-any

describe('Scan Source', () => {
    let testSubject: SeedSource;
    let cosmosContainerClientMock: IMock<CosmosContainerClient>;
    let loggerMock: IMock<Logger>;

    beforeEach(() => {
        loggerMock = Mock.ofType(Logger);

        cosmosContainerClientMock = Mock.ofType<CosmosContainerClient>();
        cosmosContainerClientMock
            .setup(async o => o.readAllDocument<ScanRequest>(loggerMock.object))
            .returns(async () => Promise.resolve(getScanRequestTestData()))
            .verifiable(Times.once());
        testSubject = new SeedSource(cosmosContainerClientMock.object, loggerMock.object);
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
