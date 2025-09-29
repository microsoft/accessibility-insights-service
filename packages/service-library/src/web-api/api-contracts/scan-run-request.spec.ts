// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { isScanRunRequest } from './scan-run-request';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe(isScanRunRequest, () => {
    test('accept valid object', () => {
        expect(
            isScanRunRequest({
                url: 'url',
                deepScan: true,
                priority: 100,
                authenticationType: 'entraId',
                site: {
                    baseUrl: 'baseUrl',
                    knownPages: ['knownPage1', 'knownPage2'],
                    discoveryPatterns: ['discoveryPattern1', 'discoveryPattern2'],
                },
                privacyScan: {
                    cookieBannerType: 'standard',
                },
                reportGroups: [
                    {
                        consolidatedId: 'consolidatedId',
                    },
                ],
                scanDefinitions: [
                    {
                        name: 'accessibility-agent',
                        args: {
                            arg1: 'full',
                        },
                        options: {
                            opt1: 'full',
                        },
                    },
                ],
            }),
        ).toEqual(true);
    });

    test('invalid if object is undefined', () => {
        expect(isScanRunRequest(undefined)).toEqual(false);
    });

    test.each([{}, { url: undefined }])('invalid if Url is missing', (obj: any) => {
        expect(isScanRunRequest(obj)).toEqual(false);
    });

    test('valid if `url` property is present', () => {
        expect(isScanRunRequest({ url: 'url' })).toEqual(true);
    });

    test.each([
        { url: 'url', deepScan: undefined },
        { url: 'url', deepScan: 1 },
    ])('validate `deepScan` property', (obj: any) => {
        expect(isScanRunRequest(obj)).toEqual(false);
    });

    test.each([
        { url: 'url', priority: undefined },
        { url: 'url', priority: 'nan' },
    ])('validate `priority` property', (obj: any) => {
        expect(isScanRunRequest(obj)).toEqual(false);
    });

    test.each([
        { url: 'url', authenticationType: undefined },
        { url: 'url', authenticationType: 1 },
        { url: 'url', authenticationType: 'none' },
    ])('validate `authenticationType` property', (obj: any) => {
        expect(isScanRunRequest(obj)).toEqual(false);
    });

    test.each([
        { url: 'url', site: undefined },
        { url: 'url', site: 'nan' },
        { url: 'url', site: { baseUrl: undefined } },
        { url: 'url', site: { baseUrl: 'baseUrl', knownPages: undefined } },
        { url: 'url', site: { baseUrl: 'baseUrl', knownPages: [1, 2, 3] } },
        { url: 'url', site: { baseUrl: 'baseUrl', knownPages: [], discoveryPatterns: undefined } },
        { url: 'url', site: { baseUrl: 'baseUrl', knownPages: [], discoveryPatterns: [1, 2, 3] } },
    ])('validate `site` object', (obj: any) => {
        expect(isScanRunRequest(obj)).toEqual(false);
    });

    test.each([
        { url: 'url', privacyScan: undefined },
        { url: 'url', privacyScan: 'nan' },
        { url: 'url', privacyScan: { cookieBannerType: undefined } },
        { url: 'url', privacyScan: { cookieBannerType: 'none' } },
    ])('validate `privacyScan` object', (obj: any) => {
        expect(isScanRunRequest(obj)).toEqual(false);
    });

    test.each([
        { url: 'url', reportGroups: undefined },
        { url: 'url', reportGroups: 'nan' },
        { url: 'url', reportGroups: [{ consolidatedId: undefined }] },
        { url: 'url', reportGroups: [{ consolidatedId: 123 }] },
    ])('validate `reportGroups` object', (obj: any) => {
        expect(isScanRunRequest(obj)).toEqual(false);
    });

    test.each([
        { url: 'url', scanDefinitions: undefined },
        { url: 'url', scanDefinitions: 'nan' },
        { url: 'url', scanDefinitions: [{ name: undefined }] },
        { url: 'url', scanDefinitions: [{ args: { agr1: 'full', arg2: undefined } }] },
        { url: 'url', scanDefinitions: [{ args: { agr1: 'full', agr2: {} } }] },
        { url: 'url', scanDefinitions: [{ options: { opt1: 'full', opt2: undefined } }] },
        { url: 'url', scanDefinitions: [{ options: { opt1: 'full', opt2: {} } }] },
    ])('validate `scanDefinitions` array', (obj: any) => {
        expect(isScanRunRequest(obj)).toEqual(false);
    });
});
