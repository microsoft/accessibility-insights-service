import { IMock, It, Mock, MockBehavior } from 'typemoq';
import { CrawlRunner } from './crawl-runner';
import { LinkExplorerRequest } from './link-explore-request';
import { LinkExplorer } from './link-explorer';
// tslint:disable: no-any no-object-literal-type-assertion no-unsafe-any

describe(CrawlRunner, () => {
    const exploreRequest: LinkExplorerRequest = { id: '123', name: 'testportal', baseUrl: 'https://www.test.com', serviceTreeId: '1' };
    let linkExplorerStrictMock: IMock<LinkExplorer>;
    let testSubject: CrawlRunner;

    beforeEach(() => {
        linkExplorerStrictMock = Mock.ofType(LinkExplorer, MockBehavior.Strict);

        testSubject = new CrawlRunner(exploreRequest, linkExplorerStrictMock.object);
    });

    it('should invoke link explorer', async () => {
        linkExplorerStrictMock
            .setup(async s => s.exploreLinks(It.isAny()))
            .returns(async () => Promise.resolve())
            .verifiable();
        await testSubject.run();

        linkExplorerStrictMock.verifyAll();
    });
});
