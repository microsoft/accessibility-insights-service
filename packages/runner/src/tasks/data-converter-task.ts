import { ResultConverter } from '../axe-converter/result-converter';
import { IssueScanResults } from '../axe-converter/scan-result';
import { AxeScanResults } from '../scanner/axe-scan-results';
import { PageScanResult } from '../storage/page-scan-result';
import { PageScanResultConverter } from '../storage/page-scan-result-converter';
import { ScanMetadata } from '../storage/scan-metadata';

export class DataConverterTask {
    public toScanResultsModel(axeScanResults: AxeScanResults, scanMetadata: ScanMetadata): IssueScanResults {
        if (axeScanResults.error === undefined) {
            const resultConverter = new ResultConverter();
            const scanResults = resultConverter.convert(axeScanResults.results, scanMetadata);

            return { results: scanResults };
        } else {
            return { results: [], error: axeScanResults.error };
        }
    }

    public toPageScanResultModel(issueScanResults: IssueScanResults, scanMetadata: ScanMetadata): PageScanResult {
        const pageScanResultConverter = new PageScanResultConverter();

        return pageScanResultConverter.convert(issueScanResults, scanMetadata);
    }
}
