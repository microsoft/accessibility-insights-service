import { LinkExplorerRequest } from './link-explore-request';
import { LinkExplorer } from './link-explorer';
export class CrawlRunner {
    constructor(private readonly exploreRequest: LinkExplorerRequest, private readonly linkExplorer: LinkExplorer) {}

    public async run(): Promise<void> {
        console.log('Invoking LinkExplorer for config - ', this.exploreRequest);
        await this.linkExplorer.exploreLinks(this.exploreRequest.baseUrl);
    }
}
