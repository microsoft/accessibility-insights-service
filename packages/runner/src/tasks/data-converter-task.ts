import { AxeResults } from 'axe-core';
import { PageScanResult } from '../storage/page-scan-result';
import { PageScanResultConverter } from '../storage/page-scan-result-converter';
import { ResultConverter } from '../storage/result-converter';
import { ScanMetadata } from '../storage/scan-metadata';
import { ScanResult } from '../storage/scan-result';

export class DataConverterTask {
    public toScanResultsModel(axeResults: AxeResults, scanMetadata: ScanMetadata): ScanResult[] {
        const resultConverter = new ResultConverter();

        return resultConverter.convert(axeResults, scanMetadata);
    }

    public toPageScanResultModel(scanResults: ScanResult[], scanMetadata: ScanMetadata): PageScanResult {
        const pageScanResultConverter = new PageScanResultConverter();

        return pageScanResultConverter.convert(scanResults, scanMetadata, undefined);
    }
}
