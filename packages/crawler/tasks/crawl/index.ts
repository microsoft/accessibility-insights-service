import { Arguments, argv } from 'yargs';
import { CrawlEntryPoint } from './crawl-entry-point';
import { CrawlRunner } from './crawl-runner';
import { HCCrawlerFactory } from './hc-crawler-factory';
import { LaunchOptionsFactory } from './launch-options-factory';
import { LinkExplorerRequest } from './link-explore-request';
import { LinkExplorer } from './link-explorer';
const crawlConfig = argv as Arguments<LinkExplorerRequest>;
const linkExplorer = new LinkExplorer(new HCCrawlerFactory(), new LaunchOptionsFactory());
const crawlRunner = new CrawlRunner(crawlConfig, linkExplorer);
const crawlEntryPoint = new CrawlEntryPoint(crawlRunner, process);

// tslint:disable-next-line: no-floating-promises
crawlEntryPoint.run();
