// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { WebsiteScanResultPart } from 'storage-documents';
import moment from 'moment';
import { reducePartDocuments } from './website-scan-result-aggregator-worker';

let dateNow: Date;

describe(reducePartDocuments, () => {
    beforeEach(() => {
        dateNow = new Date();
    });

    it('merge website part document', async () => {
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
        const expectedDocument = [
            {
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
            },
        ] as WebsiteScanResultPart[];

        const actualDocument = await reducePartDocuments([target, source]);

        expect(actualDocument).toEqual(expectedDocument);
    });
});
