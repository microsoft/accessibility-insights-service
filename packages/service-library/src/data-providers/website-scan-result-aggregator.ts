// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { WebsiteScanResultBase, WebsiteScanResultPart } from 'storage-documents';
import Parallel from 'paralleljs';
import { System } from 'common';
import _ from 'lodash';

/* eslint-disable security/detect-non-literal-require, @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */

@injectable()
export class WebsiteScanResultAggregator {
    public static parallelBlockSize = 6;

    public mergeBaseDocument(
        sourceDocument: Partial<WebsiteScanResultBase>,
        targetDocument: Partial<WebsiteScanResultBase>,
    ): Partial<WebsiteScanResultBase> {
        const propertiesToKeep = ['_etag', 'deepScanId', 'deepScanLimit', 'created'];
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

    public async mergePartDocument(
        sourceDocument: Partial<WebsiteScanResultPart>,
        targetDocument: Partial<WebsiteScanResultPart>,
    ): Promise<Partial<WebsiteScanResultPart>> {
        return this.mergePartDocuments([sourceDocument], targetDocument);
    }

    /**
     * Merge DB documents. The merge runs in a separate node process. Creating a separate process is a time consuming operation.
     * Passing a high number of documents to merge at once will reduce process creation operations when processing in batches.
     *
     * @param documents DB documents to merge.
     * @param baseDocument The base DB document to merge with DB documents.
     */
    public async mergePartDocuments(
        documents: Partial<WebsiteScanResultPart>[],
        baseDocument?: Partial<WebsiteScanResultPart>,
    ): Promise<Partial<WebsiteScanResultPart>> {
        if (_.isEmpty(documents)) {
            return baseDocument ?? {};
        }

        if (documents.length === 1 && _.isEmpty(baseDocument)) {
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
            const parallel = new Parallel(parts, { evalPath: `${__dirname}/eval.js` });

            parallel
                .map((part: Partial<WebsiteScanResultPart>[]) => {
                    // The function runs as part of a child process instantiated by paralleljs npm worker.js module
                    // and should include all dependencies to be able run as a standalone module.
                    // The parallel-workers.js module location is relative to paralleljs npm worker.js module location.
                    // Dynamic module location let bypass webpack module path modification.
                    const worker = require(`${__dirname}/parallel-workers.js`);

                    return worker.reducePartDocuments(part);
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
