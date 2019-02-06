import { Context, Logger } from '@azure/functions';
import { AxeResults } from 'axe-core';
import { IMock, Mock, Times } from 'typemoq';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { IssueFinder } from './issue-finder';
import { ResultConverter } from './result-converter';
import { ScanResult } from './scan-result';
import { Scanner } from './scanner';

describe('IssueFinder', () => {
    let scannerMock: IMock<Scanner>;
    let resultConverterMock: IMock<ResultConverter>;
    let contextStub: Context;
    let issueFinder: IssueFinder;
    const url: string = 'some url';
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

    it('should create instance', () => {
        expect(IssueFinder).not.toBeNull();
    });

    it('scan, covert and save ', async () => {
        const axeResultsMock = getPromisableDynamicMock(Mock.ofType<AxeResults>());
        // tslint:disable-next-line:no-any
        scanResultsStub = ('converted results' as any) as ScanResult[];
        setupContextCall(axeResultsMock.object, scanResultsStub);
        setupScannerCall(axeResultsMock.object);
        setupResultConvertCall(axeResultsMock.object, scanResultsStub);

        await issueFinder.findIssues(url);

        verifyMocksAndStub();
    });

    function setupResultConvertCall(axeResults: AxeResults, scanResults: ScanResult[]): void {
        resultConverterMock
            .setup(rcm => rcm.convert(axeResults))
            .returns(() => scanResults)
            .verifiable(Times.once());
    }

    function setupContextCall(axeResults: AxeResults, scanResults: ScanResult[]): void {
        // tslint:disable-next-line:no-any no-empty
        logMock = Mock.ofInstance((data: any) => {});
        logMock.setup(lm => lm(axeResults)).verifiable(Times.once());
        logMock.setup(lm => lm(scanResults)).verifiable(Times.once());
        contextStub.log = logMock.object as Logger;
    }

    function setupScannerCall(axeResults: AxeResults): void {
        scannerMock
            .setup(async rcm => rcm.scan(url))
            .returns(async () => Promise.resolve(axeResults))
            .verifiable(Times.once());
    }

    function verifyMocksAndStub(): void {
        scannerMock.verifyAll();
        resultConverterMock.verifyAll();
        logMock.verifyAll();
        expect(contextStub.bindings.scanIssues).toEqual(JSON.stringify(scanResultsStub));
    }
});
