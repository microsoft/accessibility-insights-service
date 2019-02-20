import { Scanner } from './scanner';

export interface ScanConfig {
    scanUrl: string;
}

// tslint:disable: no-console
export async function invokeScan(config: ScanConfig, scanner: Scanner): Promise<void> {
    console.log('Invoking scan for config - ', config);
    const results = await scanner.scan(config.scanUrl);

    console.log(`successfully scanned url ${config.scanUrl}. Scan results - `, results);
}
