import { inject } from 'inversify';
import { Browser } from 'puppeteer';
import { CrawlerTask } from '../tasks/crawler-task';
import { DataFactoryTask } from '../tasks/data-factory-task';
import { ScannerTask } from '../tasks/scanner-task';
import { StorageTask } from '../tasks/storage-task';
import { WebDriverTask } from '../tasks/web-driver-task';
import { WebsiteStateUpdaterTask } from '../tasks/website-state-updater-task';
import { ScanMetadata } from '../types/scan-metadata';

export class Runner {
    constructor(
        @inject(CrawlerTask) private readonly crawlerTask: CrawlerTask,
        @inject(ScannerTask) private readonly scannerTask: ScannerTask,
        @inject(WebsiteStateUpdaterTask) private readonly websiteStateUpdaterTask: WebsiteStateUpdaterTask,
        @inject(DataFactoryTask) private readonly dataFactoryTask: DataFactoryTask,
        @inject(WebDriverTask) private readonly webDriverTask: WebDriverTask,
        @inject(StorageTask) private readonly storageTask: StorageTask,
    ) {}

    public async run(scanMetadata: ScanMetadata): Promise<void> {
        let browser: Browser;
        const runTime = new Date();

        try {
            // start new web driver process
            browser = await this.webDriverTask.launch();
            // scan website page for next level pages references
            const crawlerScanResults = await this.crawlerTask.crawl(scanMetadata.scanUrl, browser);
            // convert pages references to a storage model
            const websitePages = this.dataFactoryTask.toWebsitePagesModel(crawlerScanResults, scanMetadata, runTime);
            // store pages references model in a storage
            await this.storageTask.storeResults(websitePages);

            // scan website page for accessibility issues
            const axeScanResults = await this.scannerTask.scan(scanMetadata.scanUrl);
            // convert accessibility issues to a storage model
            const issueScanResults = this.dataFactoryTask.toScanResultsModel(axeScanResults, scanMetadata);
            // store accessibility issues model in a storage
            await this.storageTask.storeResults(issueScanResults.results);

            // convert scan results to a page scan history storage model
            const pageScanResult = this.dataFactoryTask.toPageScanResultModel(crawlerScanResults, issueScanResults, scanMetadata, runTime);
            // store page scan history model in a storage
            await this.storageTask.storeResult(pageScanResult);

            // update website root scan state document with last page scan result
            await this.websiteStateUpdaterTask.update(pageScanResult, scanMetadata, runTime);
        } finally {
            await this.webDriverTask.close();
        }
    }
}
