import { Queue } from 'axis-storage';
import { IMock, It, Mock, Times } from 'typemoq';
import { WebSite } from '../request-type/website';
import { ScanRequestSender } from './request-sender';
// tslint:disable: no-unsafe-any
describe('Scan request Sender', () => {
    let queueMock: IMock<Queue>;
    let testSubject: ScanRequestSender;
    beforeEach(() => {
        queueMock = Mock.ofType<Queue>();
        queueMock
            .setup(async q => q.createQueueMessage(It.isAny(), It.isAny()))
            .returns(async () => Promise.resolve())
            .verifiable(Times.exactly(2));
        testSubject = new ScanRequestSender(queueMock.object);
    });
    it('send scan request', () => {
        // tslint:disable-next-line: no-floating-promises
        testSubject.sendRequestToScan(getWebSitesData());
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
