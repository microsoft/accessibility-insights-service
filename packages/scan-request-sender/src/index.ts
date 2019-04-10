import { CosmosClientWrapper, Queue, StorageClient, storageConfig } from 'axis-storage';
import { VError } from 'verror';
// tslint:disable: no-import-side-effect
import './node';
import { WebSite } from './request-type/website';
import { ScanRequestSender } from './sender/request-sender';
import { SeedSource } from './source/seed-source';
const storageClient = new StorageClient(new CosmosClientWrapper(), 'scanner', 'webPagesToScan');
const source = new SeedSource(storageClient);
const sender: ScanRequestSender = new ScanRequestSender(new Queue(storageConfig));

(async () => {
    const websitesToScan: WebSite[] = await source.getWebSites();
    await sender.sendRequestToScan(websitesToScan);
    cout(`[Sender] sent scan requests for ${websitesToScan.length} websites`);
})().catch(error => {
    cout(new VError(cause(error), 'An error occurred while executing sender.'));
});
