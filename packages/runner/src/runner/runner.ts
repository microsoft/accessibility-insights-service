// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { Browser } from 'puppeteer';
import { ScanMetadataConfig } from '../scan-metadata-config';
import { CrawlerTask } from '../tasks/crawler-task';
import { DataFactoryTask } from '../tasks/data-factory-task';
import { PageStateUpdaterTask } from '../tasks/page-state-updater-task';
import { ScannerTask } from '../tasks/scanner-task';
import { StorageTask } from '../tasks/storage-task';
import { WebDriverTask } from '../tasks/web-driver-task';
import { WebsiteStateUpdaterTask } from '../tasks/website-state-updater-task';

@injectable()
export class Runner {
    constructor(
        @inject(CrawlerTask) private readonly crawlerTask: CrawlerTask,
        @inject(ScannerTask) private readonly scannerTask: ScannerTask,
        @inject(WebsiteStateUpdaterTask) private readonly websiteStateUpdaterTask: WebsiteStateUpdaterTask,
        @inject(DataFactoryTask) private readonly dataFactoryTask: DataFactoryTask,
        @inject(WebDriverTask) private readonly webDriverTask: WebDriverTask,
        @inject(StorageTask) private readonly storageTask: StorageTask,
        @inject(ScanMetadataConfig) private readonly scanMetadataConfig: ScanMetadataConfig,
        @inject(PageStateUpdaterTask) private readonly pageStateUpdaterTask: PageStateUpdaterTask,
        @inject(Logger) private readonly logger: Logger,
    ) {}

    public async run(): Promise<void> {
        let browser: Browser;
        const runTime = new Date();
        const scanMetadata = this.scanMetadataConfig.getConfig();
        this.logger.setCustomProperties({ scanId: scanMetadata.scanUrl });

        try {
            // set scanned page run state to running
            this.logger.logInfo('Setting to running state on page document');
            await this.pageStateUpdaterTask.setRunningState(scanMetadata, runTime);

            // start new web driver process
            browser = await this.webDriverTask.launch();
            // scan website page for next level pages references
            const crawlerScanResults = await this.crawlerTask.crawl(scanMetadata.scanUrl, scanMetadata.baseUrl, browser);
            this.logger.logInfo(`Completed crawling ${scanMetadata.scanUrl}`);

            // convert pages references to a storage model
            const websitePages = this.dataFactoryTask.toWebsitePagesModel(crawlerScanResults, scanMetadata, runTime);

            // upsert pages references model in a storage
            this.logger.logInfo('Storing found pages');
            await this.storageTask.mergeResults(websitePages, scanMetadata.websiteId);

            // update scanned page with on-page links
            this.logger.logInfo('Storing direct links of the page in the page document');
            await this.pageStateUpdaterTask.setPageLinks(crawlerScanResults, scanMetadata);

            // scan website page for accessibility issues
            const axeScanResults = await this.scannerTask.scan(scanMetadata.scanUrl);
            // convert accessibility issues to a storage model

            const issueScanResults = this.dataFactoryTask.toScanResultsModel(axeScanResults, scanMetadata);
            // store accessibility issues model in a storage
            this.logger.logInfo(`Storing accessibility issues found in page ${scanMetadata.scanUrl}`);
            await this.storageTask.writeResults(issueScanResults.results, scanMetadata.websiteId);

            // convert scan results to a page scan history storage model
            const pageScanResult = this.dataFactoryTask.toPageScanResultModel(crawlerScanResults, issueScanResults, scanMetadata, runTime);
            // store page scan history model in a storage
            this.logger.logInfo(`Storing page scan result information for ${scanMetadata.scanUrl}`);
            await this.storageTask.writeResult(pageScanResult, scanMetadata.websiteId);

            // set scanned page run state to corresponding page run result
            this.logger.logInfo(`Setting page scan result state on the page document`);
            await this.pageStateUpdaterTask.setCompleteState(pageScanResult, scanMetadata, runTime);

            // update website root scan state document with last page scan result
            this.logger.logInfo(`Updating last page scan result of the current page on the website document`);
            await this.websiteStateUpdaterTask.update(pageScanResult, scanMetadata, runTime);
        } finally {
            await this.webDriverTask.close();
        }
    }
}
