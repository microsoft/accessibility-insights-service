import { Scanner } from './scanner';

export interface ScanConfig {
    scanUrl: string;
}

export async function runTask(config: ScanConfig, scanner: Scanner, nodeProcess: NodeJS.Process): Promise<void> {
    return invokeScan(config, scanner).catch(e => {
        console.error(e);
        nodeProcess.exitCode = 1;
    });
}

async function invokeScan(config: ScanConfig, scanner: Scanner): Promise<void> {
    console.log('Invoking scan for config - ', config);

    const results = await scanner.scan(config.scanUrl);

    console.log(`successfully scanned url ${config.scanUrl}. Scan results - `, results);
}
