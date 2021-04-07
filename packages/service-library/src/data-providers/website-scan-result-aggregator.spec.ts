// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { WebsiteScanResultBase, WebsiteScanResultPart } from 'storage-documents';
import moment from 'moment';
import * as MockDate from 'mockdate';
import { WebsiteScanResultAggregator } from './website-scan-result-aggregator';

let websiteScanResultAggregator: WebsiteScanResultAggregator;
let dateNow: Date;

describe(WebsiteScanResultAggregator, () => {
    beforeEach(() => {
        dateNow = new Date();
        MockDate.set(dateNow);

        websiteScanResultAggregator = new WebsiteScanResultAggregator();
    });

    afterEach(() => {
        MockDate.reset();
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

    it('merge website part document', () => {
        const source = {
            knownPages: ['new page', 'existing page', undefined, null /* should remove falsey value */, 'Various Case Page'],
            pageScans: [
                {
                    url: 'new url',
                    timestamp: moment(dateNow).toJSON(),
                },
                {
                    url: 'existing url',
                    timestamp: moment(dateNow).toJSON(),
                },
                {
                    url: 'updated url',
                    timestamp: moment(dateNow).add(11, 'minute').toJSON(), // new timestamp to update target value
                },
                {
                    url: 'old url',
                    timestamp: moment(dateNow).add(-7, 'minute').toJSON(), // old timestamp to keep target value
                },
                null, // should remove falsey value
            ],
        } as WebsiteScanResultPart;
        const target = {
            knownPages: ['existing page', 'old page', null, undefined /* should remove falsey value */, 'various case page'],
            pageScans: [
                {
                    url: 'existing url',
                    timestamp: moment(dateNow).toJSON(),
                },
                {
                    url: 'updated url',
                    timestamp: moment(dateNow).add(3, 'minute').toJSON(),
                },
                {
                    url: 'old url',
                    timestamp: moment(dateNow).add(1, 'minute').toJSON(),
                },
            ],
        } as WebsiteScanResultPart;
        const expectedDocument = {
            knownPages: ['existing page', 'old page', 'various case page', 'new page'],
            pageScans: [
                {
                    url: 'existing url',
                    timestamp: moment(dateNow).toJSON(),
                },
                {
                    url: 'updated url',
                    timestamp: moment(dateNow).add(11, 'minute').toJSON(),
                },
                {
                    url: 'old url',
                    timestamp: moment(dateNow).add(1, 'minute').toJSON(),
                },
                {
                    url: 'new url',
                    timestamp: moment(dateNow).toJSON(),
                },
            ],
        } as WebsiteScanResultPart;

        const actualDocument = websiteScanResultAggregator.mergePartDocument(source, target);

        expect(actualDocument).toEqual(expectedDocument);
    });
});
