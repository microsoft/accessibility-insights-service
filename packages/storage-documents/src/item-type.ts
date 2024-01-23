// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export enum ItemType {
    batchPoolLoadSnapshot = 'batchPoolLoadSnapshot',
    scanRunBatchRequest = 'scanRunBatchRequest',
    onDemandPageScanRequest = 'pageScanRequest',
    onDemandPageScanRunResult = 'pageScanRunResult',
    websiteScanResult = 'websiteScanResult',
    websiteScanData = 'websiteScanData',
    websiteScanResultPart = 'websiteScanResultPart',
    websiteScanPageData = 'websiteScanPageData',
    privacyScanConfiguration = 'privacyScanConfiguration',
    reportGeneratorRequest = 'reportGeneratorRequest',
}
