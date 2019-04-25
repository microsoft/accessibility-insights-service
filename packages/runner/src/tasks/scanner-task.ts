import { inject, injectable } from 'inversify';
import { AxeScanResults } from '../scanner/axe-scan-results';
import { Scanner } from '../scanner/scanner';

@injectable()
export class ScannerTask {
    constructor(@inject(Scanner) private readonly scanner: Scanner) {}

    public async scan(url: string): Promise<AxeScanResults> {
        return this.scanner.scan(url);
    }
}
