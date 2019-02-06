import { Context } from '@azure/functions';
import { AxeResults } from 'axe-core';
import { ResultConverter } from './result-converter';
import { ScanResult } from './scan-result';
import { Scanner } from './scanner';

export class IssueFinder {
    constructor(private readonly scanner: Scanner, private readonly resultConverter: ResultConverter, private readonly context: Context) {}

    public async findIssues(url: string): Promise<void> {
        const axeResults: AxeResults = await this.scanner.scan(url);
        this.context.log(axeResults);
        const scanResults: ScanResult[] = this.resultConverter.convert(axeResults);
        this.context.log(scanResults);
        this.context.bindings.scanIssues = JSON.stringify(scanResults);
    }
}
