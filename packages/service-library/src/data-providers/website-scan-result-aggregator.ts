// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { WebsiteScanResultBase, WebsiteScanResultPart } from 'storage-documents';
import _ from 'lodash';
import moment from 'moment';

@injectable()
export class WebsiteScanResultAggregator {
    public mergeBaseDocument(
        sourceDocument: Partial<WebsiteScanResultBase>,
        targetDocument: Partial<WebsiteScanResultBase>,
    ): Partial<WebsiteScanResultBase> {
        const propertiesToKeep = ['_etag', 'deepScanId', 'deepScanLimit'];
        const mergedDocument = _.mergeWith(targetDocument, sourceDocument, (target, source, key) => {
            // preserve the targe value if defined
            if (propertiesToKeep.includes(key)) {
                return target;
            }

            return this.mergeArray(target, source, key, ['reports', 'discoveryPatterns']);
        });

        if (mergedDocument.reports !== undefined) {
            mergedDocument.reports = _.uniqBy(mergedDocument.reports, (r) => r.reportId);
        }

        if (mergedDocument.discoveryPatterns !== undefined) {
            mergedDocument.discoveryPatterns = _.uniq(mergedDocument.discoveryPatterns);
        }

        return mergedDocument;
    }

    public mergePartDocument(
        sourceDocument: Partial<WebsiteScanResultPart>,
        targetDocument: Partial<WebsiteScanResultPart>,
    ): Partial<WebsiteScanResultPart> {
        const mergedDocument = _.mergeWith(targetDocument, sourceDocument, (target, source, key) => {
            return this.mergeArray(target, source, key, ['pageScans', 'knownPages']);
        });

        if (mergedDocument.knownPages !== undefined) {
            mergedDocument.knownPages = _.uniqWith(mergedDocument.knownPages, (a, b) => {
                if (a === undefined || b === undefined) {
                    return false;
                }

                return a.toLocaleLowerCase() === b.toLocaleLowerCase();
            });
        }

        if (mergedDocument.pageScans !== undefined) {
            const pageScansByUrl = _.groupBy(mergedDocument.pageScans, (scan) => scan.url.toLocaleLowerCase());
            mergedDocument.pageScans = Object.keys(pageScansByUrl).map((url) => {
                return _.maxBy(pageScansByUrl[url], (scan) => moment.utc(scan.timestamp).valueOf());
            });
        }

        return mergedDocument;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private mergeArray(target: any, source: any, key: string, supportedKeys: string[]): any {
        if (_.isArray(target) || _.isArray(source)) {
            if (!supportedKeys.includes(key)) {
                throw new Error(`Merge of ${key} array is not implemented.`);
            }

            if (target) {
                return _.compact(target.concat(source));
            } else {
                return _.compact(source);
            }
        }

        return undefined;
    }
}
