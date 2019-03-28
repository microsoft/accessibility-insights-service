// export types to support dependency injection
export { HCCrawlerOptionsFactory } from './crawler/hc-crawler-options-factory';
export { CrawlerTask } from './tasks/crawler-task';
export { WebDriverTask } from './tasks/web-driver-task';
export { Page } from './scanner/page';
export { ScannerTask } from './tasks/scanner-task';
export { Scanner } from './scanner/scanner';
export { DataFactoryTask } from './tasks/data-factory-task';
export { ScanResultFactory } from './factories/scan-result-factory';
export { PageScanResultFactory } from './factories/page-scan-result-factory';
export { HashGenerator } from './common/hash-generator';
export { StorageClient } from './storage/storage-client';
export { StorageTask } from './tasks/storage-task';
export { CosmosClientWrapper } from './azure/cosmos-client-wrapper';
export { Runner } from './runner/runner';
export { WebsitePageFactory } from './factories/website-page-factory';
