import { HCCrawlerFactory } from './hc-crawler-factory';
import { LaunchOptionsFactory } from './launch-options-factory';
import { LinkExplorer } from './link-explorer';

describe('LinkExplorer Integration', () => {
    it('Crawling a valid url', async () => {
        const linkExplorer = new LinkExplorer(new HCCrawlerFactory(), new LaunchOptionsFactory());
        const explreLinks: string[] = await linkExplorer.exploreLinks('https://www.microsoft.com/en-us/');
        expect(explreLinks.length).toBeGreaterThan(0);
    });

    it('Crawling an invalid url', async () => {
        const urlToExplore = 'https://www.xyzxyz.com/';
        const linkExplorer = new LinkExplorer(new HCCrawlerFactory(), new LaunchOptionsFactory());
        const explorerPromise = linkExplorer.exploreLinks(urlToExplore);
        const errorMessage = `Explorer did not explore any links originated from ${urlToExplore}`;
        await expect(explorerPromise).rejects.toEqual(new Error(errorMessage));
    }, 15000);
});
