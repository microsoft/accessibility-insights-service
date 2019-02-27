import { Arguments, argv } from 'yargs';
import { ExploreRequest } from './hc-crawler';
import { HCCrawlerFactory } from './hc-crawler-factory';
import { LaunchOptionsFactory } from './launch-options-factory';
import { LinkExplorer } from './link-explorer';
const args = argv as Arguments<ExploreRequest>;
const linkExplorer = new LinkExplorer(new HCCrawlerFactory(), new LaunchOptionsFactory());
// tslint:disable-next-line:no-require-imports no-var-requires
linkExplorer
    .exploreLinks(args.baseUrl)
    .then(result => {
        console.log(`successfully explored links from url ${args.baseUrl}`);
    })
    .catch(e => {
        console.error('Link explorer caught an error ', e);
        process.exitCode = 1;
    });
