// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

import { WebsiteScanResultBase, WebsiteScanResultPart } from 'storage-documents';
import Parallel from 'paralleljs';
import { WebsiteScanResultAggregator } from './website-scan-result-aggregator';

let websiteScanResultAggregator: WebsiteScanResultAggregator;

describe(WebsiteScanResultAggregator, () => {
    beforeEach(() => {
        websiteScanResultAggregator = new WebsiteScanResultAggregator();
    });

    it('merge website base document', () => {
        const source = {
            deepScanId: '*', // should not be merged with target
            _etag: '*', // should not be merged with target
            deepScanLimit: 7, // should not be merged with target
            discoveryPatterns: ['new discovery pattern', 'existing discovery pattern', null /* should remove falsey value */],
            reports: [
                {
                    reportId: 'new report',
                },
                {
                    reportId: 'existing report',
                },
                null, // should remove falsey value
            ],
        } as WebsiteScanResultBase;
        const target = {
            deepScanId: 'deepScanId',
            _etag: '_etag',
            deepScanLimit: 11,
            discoveryPatterns: ['existing discovery pattern', 'old discovery pattern'],
            reports: [
                {
                    reportId: 'existing report',
                },
                {
                    reportId: 'old report',
                },
            ],
        } as WebsiteScanResultBase;
        const expectedDocument = {
            deepScanId: 'deepScanId',
            _etag: '_etag',
            deepScanLimit: 11,
            discoveryPatterns: ['existing discovery pattern', 'old discovery pattern', 'new discovery pattern'],
            reports: [
                {
                    reportId: 'existing report',
                },
                {
                    reportId: 'old report',
                },
                {
                    reportId: 'new report',
                },
            ],
        } as WebsiteScanResultBase;

        const actualDocument = websiteScanResultAggregator.mergeBaseDocument(source, target);

        expect(actualDocument).toEqual(expectedDocument);
    });

    it('merge website part document', async () => {
        const source = { knownPages: ['source'] } as WebsiteScanResultPart;
        const target = { knownPages: ['target'] } as WebsiteScanResultPart;
        const expectedDocument = { knownPages: ['expected'] } as WebsiteScanResultPart;

        const parallel = new Parallel([]);
        Parallel.prototype.map = (fn: (data: any) => any): Parallel<any> => {
            parallel.data = [[expectedDocument]];

            return parallel;
        };

        const actualDocument = await websiteScanResultAggregator.mergePartDocument(source, target);

        expect(actualDocument).toEqual(expectedDocument);
    });
});
