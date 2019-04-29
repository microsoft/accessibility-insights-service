// tslint:disable: no-unsafe-any
import { StorageClient } from 'axis-storage';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { ScanRequest, WebSite } from '../request-type/website';

@injectable()
export class SeedSource {
    constructor(@inject(StorageClient) private readonly storageClient: StorageClient, @inject(Logger) private readonly logger: Logger) {}
    public async getWebSites(): Promise<WebSite[]> {
        const sourceRequest = await this.storageClient.readAllDocument<ScanRequest>();

        if (sourceRequest.statusCode === 200) {
            if (sourceRequest.item.length > 0) {
                this.logger.logInfo(`[Sender] retrive ${sourceRequest.item[0].websites.length} website documents`);
                sourceRequest.item[0].websites.forEach(site => {
                    site.scanUrl = site.baseUrl;
                });

                return sourceRequest.item[0].websites;
            } else {
                throw new Error(`There is no source website document exists`);
            }
        } else {
            throw new Error(
                `An error occurred while retrieving website to scan document. Server response: ${JSON.stringify(sourceRequest.response)}`,
            );
        }
    }
}
