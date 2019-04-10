import { CosmosOperationResponse, StorageClient } from 'axis-storage';
import { IMock, Mock, Times } from 'typemoq';
// tslint:disable: no-import-side-effect no-any
// tslint:disable: no-unsafe-any
import '../node';
import { ScanRequest, WebSite } from '../request-type/website';
import { SeedSource } from './seed-source';

describe('Scan Source', () => {
    let testSubject: SeedSource;
    let storageClientMock: IMock<StorageClient>;
    beforeEach(() => {
        storageClientMock = Mock.ofType<StorageClient>();
        storageClientMock
            .setup(async o => o.readAllDocument<ScanRequest>())
            .returns(async () => Promise.resolve(getScanRequestTestData()))
            .verifiable(Times.once());
        testSubject = new SeedSource(storageClientMock.object);
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
