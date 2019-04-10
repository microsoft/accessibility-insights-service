import { Queue, storageConfig } from 'axis-storage';
import { WebSite } from '../request-type/website';
export class ScanRequestSender {
    constructor(private readonly queue: Queue) {}
    public async sendRequestToScan(websites: WebSite[]): Promise<void> {
        await Promise.all(
            websites.map(async message => {
                await this.queue.createQueueMessage(storageConfig.scanQueue, JSON.stringify(message));
            }),
        );
    }
}
