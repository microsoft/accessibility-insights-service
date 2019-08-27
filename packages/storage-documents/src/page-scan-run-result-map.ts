// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
export declare type DocumentType = 'pageScanRunResult' | 'pageScanRunSarifReport';

/**
 * The mapping document between scan run ID and all scan run corresponding documents.
 */
export interface PageScanRunResultMap {
    scanId: string;
    url: string;
    links: Link[];
}

export interface Link {
    documentType: DocumentType;
    href: string;
}
