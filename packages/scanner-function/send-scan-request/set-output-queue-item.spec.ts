import { Context } from '@azure/functions';

import { ScanRequest, WebSite } from './scan-request';
import { setOutputQueueItem } from './set-output-queue-item';

describe('SendScanRequest', () => {
    let contextStub: Context;
    let testData: ScanRequest[];
    beforeEach(() => {
        //tslint:disable-next-line: no-object-literal-type-assertion no-any no-empty
        contextStub = { bindings: {}, log: (() => {}) as any } as Context;
        testData = [
            {
                id: '123',
                count: 68,
                websites: getWebSitesData(),
            },
        ];
    });

    it('should send crawl requests', async () => {
        //tslint:disable-next-line: no-floating-promises
        setOutputQueueItem(contextStub, testData);

        expect(contextStub.bindings.outputQueueItem).toEqual(getWebSitesDataWithScanUrl());
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

    function getWebSitesDataWithScanUrl(): WebSite[] {
        return [
            {
                id: '7113152f-4d38-4443-a0d8-a07a6aab32f9',
                name: 'Azure',
                baseUrl: 'https://azure.microsoft.com/',
                scanUrl: 'https://azure.microsoft.com/',
                serviceTreeId: '7113152f-4d38-4443-a0d8-a07a5aab32f9',
            },
            {
                id: '7113152f-4d38-4443-a0d8-b07a6aab32f9',
                name: 'Channel9',
                baseUrl: '"https://channel9.msdn.com/',
                scanUrl: '"https://channel9.msdn.com/',
                serviceTreeId: '7113152f-4d38-4443-v0d8-a07a5aab32f9',
            },
        ] as WebSite[];
    }
});
