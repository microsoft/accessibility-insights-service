import { Browser } from 'puppeteer';
import { container } from '../inversify.config';
import { ScanMetadata } from '../storage/scan-metadata';
import { CrawlerTask } from '../tasks/crawler-task';
import { DataConverterTask } from '../tasks/data-converter-task';
import { ScannerTask } from '../tasks/scanner-task';
import { StorageTask } from '../tasks/storage-tasks';
import { WebDriverTask } from '../tasks/web-driver-task';

export class Runner {
    private readonly crawlerTasks = container.get<CrawlerTask>(CrawlerTask);
    private readonly webDriverTasks = container.get<WebDriverTask>(WebDriverTask);
    private readonly scannerTasks = container.get<ScannerTask>(ScannerTask);

    constructor(
        //private readonly webDriverTasks: WebDriverTask = new WebDriverTask(),
        //private readonly crawlerTasks: CrawlerTask = new CrawlerTask(),
        // private readonly scannerTasks: ScannerTask = new ScannerTask(),
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

            const crawlerScanResults = await this.crawlerTasks.crawl(request.scanUrl, browser);
            coutd({ object: 'crawlerScanResults', value: crawlerScanResults });

            const axeScanResults = await this.scannerTasks.scan(request.scanUrl);
            const issueScanResults = this.dataConverterTask.toScanResultsModel(axeScanResults, scanMetadata);
            await this.storageTasks.storeResults(issueScanResults.results);

            const pageScanResult = this.dataConverterTask.toPageScanResultModel(issueScanResults, scanMetadata);
            await this.storageTasks.storeResult(pageScanResult);
        } finally {
            await this.webDriverTasks.close(browser);
        }
    }
}
