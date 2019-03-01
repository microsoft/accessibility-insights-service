import { CrawlRunner } from './crawl-runner';
export class CrawlEntryPoint {
    constructor(private readonly crawlRunner: CrawlRunner, private readonly nodeProcess: NodeJS.Process) {}

    public async run(): Promise<void> {
        try {
            await this.crawlRunner.run();
        } catch (e) {
            console.error('Link explorer caught an error ', e);
            this.nodeProcess.exitCode = 1;
        }
    }
}
