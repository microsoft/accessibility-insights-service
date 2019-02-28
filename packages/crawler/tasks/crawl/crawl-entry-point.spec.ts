import { IMock, Mock, MockBehavior } from 'typemoq';
import { CrawlEntryPoint } from './crawl-entry-point';
import { CrawlRunner } from './crawl-runner';

// tslint:disable: no-any no-object-literal-type-assertion

describe(CrawlEntryPoint, () => {
    let crawlRunnerStrictMock: IMock<CrawlRunner>;
    let processStub: NodeJS.Process;
    let testSubject: CrawlEntryPoint;

    beforeEach(() => {
        crawlRunnerStrictMock = Mock.ofType(CrawlRunner, MockBehavior.Strict);
        processStub = {} as NodeJS.Process;
        testSubject = new CrawlEntryPoint(crawlRunnerStrictMock.object, processStub);
    });

    it('runs task runner', async () => {
        crawlRunnerStrictMock
            .setup(async s => s.run())
            .returns(async () => Promise.resolve(undefined))
            .verifiable();

        await testSubject.run();

        expect(processStub.exitCode).not.toBeDefined();
        crawlRunnerStrictMock.verifyAll();
    });

    it('sets process exit code on error', async () => {
        const failureMessage = 'Link explorer caught an error';
        crawlRunnerStrictMock.setup(async s => s.run()).returns(async () => Promise.reject(failureMessage));

        await expect(testSubject.run()).resolves.toBe(undefined);
        expect(processStub.exitCode).toBe(1);
    });
});
