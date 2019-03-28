import { inject } from 'inversify';
import { Browser } from 'puppeteer';
import { ScanMetadata } from '../common/scan-metadata';
import { CrawlerTask } from '../tasks/crawler-task';
import { DataFactoryTask } from '../tasks/data-factory-task';
import { ScannerTask } from '../tasks/scanner-task';
import { StorageTask } from '../tasks/storage-task';
import { WebDriverTask } from '../tasks/web-driver-task';

export class Runner {
    constructor(
        @inject(CrawlerTask) private readonly crawlerTask: CrawlerTask,
        @inject(WebDriverTask) private readonly webDriverTask: WebDriverTask,
        @inject(ScannerTask) private readonly scannerTask: ScannerTask,
        @inject(StorageTask) private readonly storageTask: StorageTask,
        @inject(DataFactoryTask) private readonly dataFactoryTask: DataFactoryTask,
    ) {}

    public async run(scanMetadata: ScanMetadata): Promise<void> {
        let browser: Browser;
        const runTime = new Date();

        try {
            browser = await this.webDriverTask.launch();
            const crawlerScanResults = await this.crawlerTask.crawl(scanMetadata.scanUrl, browser);
            const websitePages = this.dataFactoryTask.toLinkResultModel(crawlerScanResults, scanMetadata, runTime);
            await this.storageTask.storeResults(websitePages);

            const axeScanResults = await this.scannerTask.scan(scanMetadata.scanUrl);
            const issueScanResults = this.dataFactoryTask.toScanResultsModel(axeScanResults, scanMetadata);
            await this.storageTask.storeResults(issueScanResults.results);

            const pageScanResult = this.dataFactoryTask.toPageScanResultModel(crawlerScanResults, issueScanResults, scanMetadata, runTime);
            await this.storageTask.storeResult(pageScanResult);
        } finally {
            await this.webDriverTask.close(browser);
        }
    }
}
