// export types to support dependency injection
export { HCCrawlerOptionsFactory } from './crawler/hc-crawler-options-factory';
export { CrawlerTask } from './tasks/crawler-task';
export { WebDriverTask } from './tasks/web-driver-task';
export { Page } from './scanner/page';
export { ScannerTask } from './tasks/scanner-task';
export { Scanner } from './scanner/scanner';
export { DataConverterTask } from './tasks/data-converter-task';
export { ScanResultConverter } from './converters/scan-result-converter';
export { PageScanResultConverter } from './converters/page-scan-result-converter';
export { HashGenerator } from './common/hash-generator';
export { StorageClient } from './storage/storage-client';
export { StorageTask } from './tasks/storage-task';
export { CosmosClientWrapper } from './azure/cosmos-client-wrapper';
export { Runner } from './runner/runner';
export { LinkResultConverter } from './converters/link-result-converter';
