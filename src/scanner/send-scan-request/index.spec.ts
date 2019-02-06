import { Context } from '@azure/functions';
import { run } from './index';
import { ScanRequest, WebSite } from './scan-request';
describe('SendScanRequest', () => {
    let contextStub: Context;
    let testData: ScanRequest[];
    beforeEach(() => {
        //tslint:disable-next-line: no-object-literal-type-assertion no-any no-empty
        contextStub = { bindings: {}, log: (() => { }) as any } as Context;
        testData = [{
            id: '123',
            count: 68,
            websites: [
                {
                    id: '7113152f-4d38-4443-a0d8-a07a6aab32f9',
                    name: 'Azure',
                    baseUrl: 'https://azure.microsoft.com/',
                    serviceTreeId: '7113152f-4d38-4443-a0d8-a07a5aab32f9'
                },
                {
                    id: '7113152f-4d38-4443-a0d8-b07a6aab32f9',
                    name: 'Channel9',
                    baseUrl: '"https://channel9.msdn.com/',
                    serviceTreeId: '7113152f-4d38-4443-v0d8-a07a5aab32f9'
                }
            ]
        }];
    });

    it('should send crawl requests', async () => {
        const websites = [
            {
                id: '7113152f-4d38-4443-a0d8-a07a6aab32f9',
                name: 'Azure',
                baseUrl: 'https://azure.microsoft.com/',
                serviceTreeId: '7113152f-4d38-4443-a0d8-a07a5aab32f9'
            },
            {
                id: '7113152f-4d38-4443-a0d8-b07a6aab32f9',
                name: 'Channel9',
                baseUrl: '"https://channel9.msdn.com/',
                serviceTreeId: '7113152f-4d38-4443-v0d8-a07a5aab32f9'
            }
        ] as WebSite[];
        run(contextStub, undefined, testData);
        expect(contextStub.bindings.outputQueueItem).toBeDefined();
        expect(contextStub.bindings.outputQueueItem).toEqual(websites);
    });
});
