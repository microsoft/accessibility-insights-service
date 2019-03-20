import * as sha256 from 'sha.js';
import { HashIdGenerator } from '../common/hash-id-generator';
import { PageScanResult, RunState, ScanResultLevel } from './page-scan-result';
import { ScanMetadata } from './scan-metadata';
import { ScanResult } from './scan-result';

export class PageScanResultConverter {
    public constructor(private readonly hashIdGenerator: HashIdGenerator = new HashIdGenerator(sha256)) {}

    public convert(scanResults: ScanResult[], scanMetadata: ScanMetadata, error: Error): PageScanResult {
        const id = this.hashIdGenerator.generateLinkResultId(scanMetadata.baseUrl, scanMetadata.scanUrl);
        const runState = error === undefined ? RunState.completed : RunState.failed;
        const scanResultIds = scanResults.map(i => i.id);
        const lastRunTime = new Date().toJSON();

        if (runState === RunState.completed) {
            return {
                id: id,
                websiteId: scanMetadata.id,
                url: scanMetadata.scanUrl,
                depth: scanMetadata.depth,
                scan: {
                    result: {
                        lastRunTime: lastRunTime,
                        level: scanResults.length === 0 ? ScanResultLevel.pass : ScanResultLevel.fail,
                        issues: scanResultIds,
                    },
                    run: {
                        lastRunTime: lastRunTime,
                        state: runState,
                    },
                },
            };
        } else {
            return {
                id: id,
                websiteId: scanMetadata.id,
                url: scanMetadata.scanUrl,
                depth: scanMetadata.depth,
                scan: {
                    run: {
                        lastRunTime: lastRunTime,
                        state: runState,
                    },
                },
            };
        }
    }
}
