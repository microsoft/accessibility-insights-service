import { setupScanRequestSenderContainer } from './setup-scan-request-sender-container';

import { VError } from 'verror';
// tslint:disable: no-import-side-effect
// tslint:disable: no-unsafe-any
import './node';
import { WebSite } from './request-type/website';
import { ScanRequestSender } from './sender/request-sender';
import { SeedSource } from './source/seed-source';

const container = setupScanRequestSenderContainer();
const source = container.get(SeedSource);
const sender: ScanRequestSender = container.get(ScanRequestSender);

(async () => {
    const websitesToScan: WebSite[] = await source.getWebSites();
    await sender.sendRequestToScan(websitesToScan);
    cout(`[Sender] sent scan requests for ${websitesToScan.length} websites`);
})().catch(error => {
    cout(new VError(cause(error), 'An error occurred while executing sender.'));
});
