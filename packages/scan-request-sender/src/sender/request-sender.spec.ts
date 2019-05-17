import 'reflect-metadata';

import { Queue, StorageConfig } from 'axis-storage';
import { IMock, Mock, Times } from 'typemoq';
import { WebSite } from '../request-type/website';
import { ScanRequestSender } from './request-sender';
// tslint:disable: no-unsafe-any
describe('Scan request Sender', () => {
    let queueMock: IMock<Queue>;
    let testSubject: ScanRequestSender;
    let storageConfigStub: StorageConfig;
    beforeEach(() => {
        storageConfigStub = {
            scanQueue: 'test-scan-queue',
        };

        queueMock = Mock.ofType<Queue>();

        testSubject = new ScanRequestSender(queueMock.object, storageConfigStub);
    });
    it('send scan request', async () => {
        const websitesData = getWebSitesData();

        // tslint:disable-next-line: no-floating-promises
        websitesData.forEach(website => {
            queueMock
                .setup(async q => q.createMessage(storageConfigStub.scanQueue, website))
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());
        });

        await testSubject.sendRequestToScan(websitesData);

        queueMock.verifyAll();
    });

    function getWebSitesData(): WebSite[] {
        return [
            {
                id: '7113152f-4d38-4443-a0d8-a07a6aab32f9',
                name: 'Azure',
                baseUrl: 'https://azure.microsoft.com/',
                serviceTreeId: '7113152f-4d38-4443-a0d8-a07a5aab32f9',
            },
            {
                id: '7113152f-4d38-4443-a0d8-b07a6aab32f9',
                name: 'Channel9',
                baseUrl: '"https://channel9.msdn.com/',
                serviceTreeId: '7113152f-4d38-4443-v0d8-a07a5aab32f9',
            },
        ] as WebSite[];
    }
});
