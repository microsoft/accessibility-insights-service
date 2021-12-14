// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { WebsiteScanResultBase, WebsiteScanResultPart } from 'storage-documents';
import Parallel from 'paralleljs';
import { System } from 'common';
import { mergeWith, uniqBy, uniq, isEmpty, isArray, compact } from 'lodash';

/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */

@injectable()
export class WebsiteScanResultAggregator {
    public static parallelBlockSize = 6;

    public mergeBaseDocument(
        sourceDocument: Partial<WebsiteScanResultBase>,
        targetDocument: Partial<WebsiteScanResultBase>,
    ): Partial<WebsiteScanResultBase> {
        const propertiesToKeep = ['_etag', 'deepScanId', 'deepScanLimit'];
        const mergedDocument = mergeWith(targetDocument, sourceDocument, (target, source, key) => {
            // preserve the targe value if defined
            if (propertiesToKeep.includes(key)) {
                return target;
            }

            return this.mergeArray(target, source, key, ['reports', 'discoveryPatterns']);
        });

        if (mergedDocument.reports !== undefined) {
            mergedDocument.reports = uniqBy(mergedDocument.reports, (r) => r.reportId);
        }

        if (mergedDocument.discoveryPatterns !== undefined) {
            mergedDocument.discoveryPatterns = uniq(mergedDocument.discoveryPatterns);
        }

        return mergedDocument;
    }

    public async mergePartDocument(
        sourceDocument: Partial<WebsiteScanResultPart>,
        targetDocument: Partial<WebsiteScanResultPart>,
    ): Promise<Partial<WebsiteScanResultPart>> {
        return this.mergePartDocuments([sourceDocument], targetDocument);
    }

    public async mergePartDocuments(
        documents: Partial<WebsiteScanResultPart>[],
        baseDocument?: Partial<WebsiteScanResultPart>,
    ): Promise<Partial<WebsiteScanResultPart>> {
        if (isEmpty(documents)) {
            return baseDocument ?? {};
        }

        if (documents.length === 1 && isEmpty(baseDocument)) {
            return documents[0];
        }

        let mergeResult: Partial<WebsiteScanResultPart>[] = [];
        mergeResult.push(baseDocument);
        mergeResult.push(...documents);

        do {
            mergeResult = await this.mergePartDocumentsParallel(mergeResult);
        } while (mergeResult.length > 1);

        return mergeResult[0];
    }

    /* istanbul ignore file */
    private async mergePartDocumentsParallel(documents: Partial<WebsiteScanResultPart>[]): Promise<Partial<WebsiteScanResultPart>[]> {
        const partResults = await new Promise<Partial<WebsiteScanResultPart>[][]>((resolve, reject) => {
            const parts = System.chunkArray(documents, WebsiteScanResultAggregator.parallelBlockSize);
            const parallel = new Parallel(parts);

            // The scope of a parallel function should include all dependencies to run as a child process
            parallel
                .map((part: Partial<WebsiteScanResultPart>[]) => {
                    const _ = require('lodash');
                    const moment = require('moment');

                    const mergeArray = function (target: any, source: any, key: string, supportedKeys: string[]): any {
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
                    };

                    const mergePartDocument = function (
                        sourceDocument: Partial<WebsiteScanResultPart>,
                        targetDocument: Partial<WebsiteScanResultPart>,
                    ): Partial<WebsiteScanResultPart> {
                        const mergedDocument = _.mergeWith(targetDocument, sourceDocument, (target: any, source: any, key: any) => {
                            return mergeArray(target, source, key, ['pageScans', 'knownPages']);
                        });

                        if (mergedDocument.knownPages !== undefined) {
                            mergedDocument.knownPages = _.uniqWith(mergedDocument.knownPages, (a: any, b: any) => {
                                if (a === undefined || b === undefined) {
                                    return false;
                                }

                                return a.toLocaleLowerCase() === b.toLocaleLowerCase();
                            });
                        }

                        if (mergedDocument.pageScans !== undefined) {
                            const pageScansByUrl = _.groupBy(mergedDocument.pageScans, (scan: any) => scan.url.toLocaleLowerCase());
                            mergedDocument.pageScans = Object.keys(pageScansByUrl).map((url) => {
                                return _.maxBy(pageScansByUrl[url], (scan: any) => moment.utc(scan.timestamp).valueOf());
                            });
                        }

                        return mergedDocument;
                    };

                    return [part.reduce((prev, next) => mergePartDocument(next, prev), {}) as Partial<WebsiteScanResultPart>];
                })
                .then(
                    (data) => {
                        resolve(data);
                    },
                    (error) => {
                        reject(error);
                    },
                );
        });

        return partResults.map((p) => p[0]);
    }

    private mergeArray(target: any, source: any, key: string, supportedKeys: string[]): any {
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
}
