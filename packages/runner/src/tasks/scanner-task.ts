import { inject } from 'inversify';
import { AxeScanResults } from '../scanner/axe-scan-results';
//import { Page } from '../scanner/page';
import { Scanner } from '../scanner/scanner';

export class ScannerTask {
    constructor(@inject(Scanner) private readonly scanner: Scanner) {}

    public async scan(url: string): Promise<AxeScanResults> {
        //const scanner = new Scanner(new Page(runnerContext.browser));

        return this.scanner.scan(url);
    }
}
