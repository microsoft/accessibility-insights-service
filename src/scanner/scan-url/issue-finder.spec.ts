import { Context, Logger } from '@azure/functions';
import { AxeResults } from 'axe-core';
import { IMock, Mock, Times } from 'typemoq';
import { ScanRequest } from '../crawl-url/simple-crawler';
import { IssueFinder } from './issue-finder';
import { ResultConverter } from './result-converter';
import { ScanResult } from './scan-result';
import { Scanner } from './scanner';

describe('IssueFinder', () => {
    let scannerMock: IMock<Scanner>;
    let resultConverterMock: IMock<ResultConverter>;
    let contextStub: Context;
    let issueFinder: IssueFinder;
    const request: ScanRequest = {
        id: 'test product id',
        name: 'test name',
        baseUrl: 'test base url',
        scanUrl: 'test scan url',
        serviceTreeId: 'test service tree id',
    };
    let scanResultsStub: ScanResult[];
    // tslint:disable-next-line:no-any
    let logMock: IMock<(data: any) => void>;

    beforeEach(() => {
        resultConverterMock = Mock.ofType<ResultConverter>();
        scannerMock = Mock.ofType<Scanner>();
        //tslint:disable-next-line: no-object-literal-type-assertion no-any no-empty
        contextStub = { bindings: {}, log: (() => {}) as any } as Context;
        issueFinder = new IssueFinder(scannerMock.object, resultConverterMock.object, contextStub);
    });

    it('scan, covert and save ', async () => {
        const axeResultsStub = getAxeResultsStub();
        // tslint:disable-next-line:no-any
        scanResultsStub = (['abc'] as any) as ScanResult[];
        setupContextCall();
        setupScannerCall(axeResultsStub);
        setupResultConvertCall(axeResultsStub, scanResultsStub);

        await issueFinder.findIssues(request);

        expect(contextStub.bindings.scanIssues).toEqual(JSON.stringify(scanResultsStub));
        verifyMocks();
    });

    function setupResultConvertCall(axeResults: AxeResults, scanResults: ScanResult[]): void {
        resultConverterMock
            .setup(rcm => rcm.convert(axeResults, request))
            .returns(() => scanResults)
            .verifiable(Times.once());
    }

    function setupContextCall(): void {
        // tslint:disable-next-line:no-any no-empty
        logMock = Mock.ofInstance((data: any) => {});
        logMock.setup(lm => lm('axe results count 1.')).verifiable(Times.once());
        logMock.setup(lm => lm('converted results count 1.')).verifiable(Times.once());
        contextStub.log = logMock.object as Logger;
    }

    function setupScannerCall(axeResults: AxeResults): void {
        scannerMock
            .setup(async rcm => rcm.scan(request.scanUrl))
            .returns(async () => Promise.resolve(axeResults))
            .verifiable(Times.once());
    }

    function verifyMocks(): void {
        scannerMock.verifyAll();
        resultConverterMock.verifyAll();
        logMock.verifyAll();
    }

    function getAxeResultsStub(): AxeResults {
        // tslint:disable-next-line:no-any
        return ({ violations: ['abc'] } as any) as AxeResults;
    }
});
