import { IMock, It, Mock, Times } from 'typemoq';
import { CosmosClientWrapper } from '../azure-cosmos/cosmos-client-wrapper';
import { PageDocumentProvider } from './page-document-provider';
const dbName = 'dbName';
const collectionName = 'collectionName';
let cosmosClientWrapperMock: IMock<CosmosClientWrapper>;
let pageDocumentProvider: PageDocumentProvider;
beforeEach(() => {
    cosmosClientWrapperMock = Mock.ofType<CosmosClientWrapper>();
    pageDocumentProvider = new PageDocumentProvider(cosmosClientWrapperMock.object, dbName, collectionName);
});
describe('PageDocumentProvider', () => {
    it('read ready to scan pages', async () => {
        const item = [
            {
                value: 'value1',
            },
            {
                value: 'value2',
            },
        ];
        const expectedResult = {
            item: item,
            statusCode: 200,
        };
        cosmosClientWrapperMock
            // tslint:disable-next-line: no-unsafe-any
            .setup(async o => o.readItems(dbName, collectionName, It.isAny()))
            .returns(async () => Promise.resolve({ item: item, statusCode: 200 }))
            .verifiable(Times.once());

        const result = await pageDocumentProvider.getReadyToScanPages();
        expect(result).toEqual(expectedResult);
        cosmosClientWrapperMock.verifyAll();
    });
});
