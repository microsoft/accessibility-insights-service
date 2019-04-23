import { injectable } from 'inversify';
import * as sha256 from 'sha.js';

@injectable()
export class HashGenerator {
    public constructor(private readonly sha: typeof sha256 = sha256) {}

    public generateBase64Hash(...values: string[]): string {
        const hashSeed: string = values.join('|').toLowerCase();

        return this.sha('sha256')
            .update(hashSeed)
            .digest('hex');
    }

    public getPageScanResultDocumentId(baseUrl: string, url: string, runTimeValue: number): string {
        // preserve parameters order for the hash compatibility
        return this.generateBase64Hash(baseUrl, url, runTimeValue.toString());
    }

    public getScanResultDocumentId(scanUrl: string, selector: string, html: string, resultId: string): string {
        // preserve parameters order for the hash compatibility
        return this.generateBase64Hash(scanUrl, selector, html, resultId);
    }

    public getWebsiteDocumentId(baseUrl: string): string {
        // preserve parameters order for the hash compatibility
        return this.generateBase64Hash(baseUrl);
    }

    public getWebsitePageDocumentId(baseUrl: string, url: string): string {
        // preserve parameters order for the hash compatibility
        return this.generateBase64Hash(baseUrl, url);
    }
}
