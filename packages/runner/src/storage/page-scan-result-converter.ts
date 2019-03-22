import * as sha256 from 'sha.js';
import { IssueScanResults } from '../axe-converter/scan-result';
import { HashIdGenerator } from '../common/hash-id-generator';
import { PageScanResult, RunState, ScanResultLevel } from './page-scan-result';
import { ScanMetadata } from './scan-metadata';

export class PageScanResultConverter {
    public constructor(private readonly hashIdGenerator: HashIdGenerator = new HashIdGenerator(sha256)) {}

    public convert(issueScanResults: IssueScanResults, scanMetadata: ScanMetadata): PageScanResult {
        const id = this.hashIdGenerator.generateLinkResultId(scanMetadata.baseUrl, scanMetadata.scanUrl);
        const runState = issueScanResults.error === undefined ? RunState.completed : RunState.failed;
        const scanResultIds = issueScanResults.results.map(i => i.id);
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
                        level: issueScanResults.results.length === 0 ? ScanResultLevel.pass : ScanResultLevel.fail,
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
