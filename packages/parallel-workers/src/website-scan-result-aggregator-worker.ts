// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { WebsiteScanResultPart } from 'storage-documents';
import { mergeWith, uniqWith, groupBy, maxBy, isArray, compact } from 'lodash';
import moment from 'moment';

export function websiteScanResultAggregatorWorker(part: Partial<WebsiteScanResultPart>[]): Partial<WebsiteScanResultPart>[] {
    return [part.reduce((prev, next) => mergePartDocument(next, prev), {}) as Partial<WebsiteScanResultPart>];
}

function mergePartDocument(
    sourceDocument: Partial<WebsiteScanResultPart>,
    targetDocument: Partial<WebsiteScanResultPart>,
): Partial<WebsiteScanResultPart> {
    const mergedDocument = mergeWith(targetDocument, sourceDocument, (target, source, key) => {
        return mergeArray(target, source, key, ['pageScans', 'knownPages']);
    });

    if (mergedDocument.knownPages !== undefined) {
        mergedDocument.knownPages = uniqWith(mergedDocument.knownPages, (a, b) => {
            if (a === undefined || b === undefined) {
                return false;
            }

            return a.toLocaleLowerCase() === b.toLocaleLowerCase();
        });
    }

    if (mergedDocument.pageScans !== undefined) {
        const pageScansByUrl = groupBy(mergedDocument.pageScans, (scan) => scan.url.toLocaleLowerCase());
        mergedDocument.pageScans = Object.keys(pageScansByUrl).map((url) => {
            return maxBy(pageScansByUrl[url], (scan) => moment.utc(scan.timestamp).valueOf());
        });
    }

    return mergedDocument;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeArray(target: any, source: any, key: string, supportedKeys: string[]): any {
    if (isArray(target) || isArray(source)) {
        if (!supportedKeys.includes(key)) {
            throw new Error(`Merge of ${key} array is not implemented.`);
        }

        if (target) {
            return compact(target.concat(source));
        } else {
            return compact(source);
        }
    }

    return undefined;
}
