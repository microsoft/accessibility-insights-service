import * as Puppeteer from 'puppeteer';
import { IMock, Mock, Times } from 'typemoq';

import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { Scanner } from './scanner';

describe('Scanner', () => {
    let launchBrowserMock: IMock<typeof Puppeteer.launch>;
    let browserMock: IMock<Puppeteer.Browser>;
    let pageMock: IMock<Puppeteer.Page>;
    let scanner: Scanner;

    beforeEach(() => {
        browserMock = Mock.ofType<Puppeteer.Browser>();
        launchBrowserMock = Mock.ofType<typeof Puppeteer.launch>();
        scanner = new Scanner(launchBrowserMock.object);
        pageMock = Mock.ofType<Puppeteer.Page>();

        browserMock = getPromisableDynamicMock(browserMock);

        launchBrowserMock
            .setup(async l =>
                l({
                    timeout: 15000,
                }),
            )
            .returns(async () => {
                return Promise.resolve(browserMock.object);
            });
        jest.setTimeout(20000);
    });

    it('should create instance', () => {
        expect(scanner).not.toBeNull();
    });

    it('should launch browser page with given url', async () => {
        const url = 'some url';

        pageMock = getPromisableDynamicMock(pageMock);
        browserMock.setup(async b => b.newPage()).returns(async () => Promise.resolve(pageMock.object));
        pageMock
            .setup(async p => p.goto(url))
            .returns(async () => Promise.resolve(undefined))
            .verifiable(Times.once());

        await scanner.scan(url);
        browserMock
            .setup(async b => b.close())
            .returns(async () => Promise.resolve(undefined))
            .verifiable();

        pageMock.verifyAll();
        browserMock.verifyAll();
    }, 20000);
});
