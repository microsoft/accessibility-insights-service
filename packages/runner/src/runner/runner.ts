import { Browser } from 'puppeteer';
import { ScanMetadata } from '../storage/scan-metadata';
import { CrawlerTask } from '../tasks/crawler-task';
import { DataConverterTask } from '../tasks/data-converter-task';
import { ScannerTask } from '../tasks/scanner-task';
import { StorageTask } from '../tasks/storage-tasks';
import { WebDriverTask } from '../tasks/web-driver-task';

export class Runner {
    constructor(
        private readonly webDriverTasks: WebDriverTask = new WebDriverTask(),
        private readonly crawlerTasks: CrawlerTask = new CrawlerTask(),
        private readonly scannerTasks: ScannerTask = new ScannerTask(),
        private readonly storageTasks: StorageTask = new StorageTask(),
        private readonly dataConverterTask: DataConverterTask = new DataConverterTask(),
    ) {}

    public async run(request: RunnerRequest): Promise<void> {
        let browser: Browser;

        try {
            const scanMetadata: ScanMetadata = {
                id: request.id,
                name: request.name,
                baseUrl: request.baseUrl,
                scanUrl: request.scanUrl,
                depth: request.depth,
                serviceTreeId: request.serviceTreeId,
            };

            browser = await this.webDriverTasks.launch();
            const crawlerResult = await this.crawlerTasks.crawl(request.scanUrl, browser);
            console.log(crawlerResult); // TODO remove

            const axeResults = await this.scannerTasks.scan(request.scanUrl);
            console.log(axeResults); // TODO remove

            const scanResults = this.dataConverterTask.toScanResultsModel(axeResults, scanMetadata);
            console.log(scanResults); // TODO remove

            await this.storageTasks.storeResults(scanResults);

            const pageScanResult = this.dataConverterTask.toPageScanResultModel(scanResults, scanMetadata);
            await this.storageTasks.storeResult(pageScanResult);
        } finally {
            await this.webDriverTasks.close(browser);
        }
    }
}
