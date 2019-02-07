import { Context } from '@azure/functions';
import { AxeResults } from 'axe-core';
import { ScanRequest } from '../crawl-url/simple-crawler';
import { ResultConverter } from './result-converter';
import { ScanResult } from './scan-result';
import { Scanner } from './scanner';

export class IssueFinder {
    constructor(private readonly scanner: Scanner, private readonly resultConverter: ResultConverter, private readonly context: Context) {}

    public async findIssues(request: ScanRequest): Promise<void> {
        const axeResults: AxeResults = await this.scanner.scan(request.scanUrl);
        this.context.log(`axe results count ${axeResults.violations.length}.`);
        const scanResults: ScanResult[] = this.resultConverter.convert(axeResults, request);
        this.context.log(`converted results count ${scanResults.length}.`);
        this.context.bindings.scanIssues = JSON.stringify(scanResults);
    }
}
