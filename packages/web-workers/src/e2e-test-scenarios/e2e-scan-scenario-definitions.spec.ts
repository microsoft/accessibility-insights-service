// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';
import { AvailabilityTestConfig } from 'common';
import * as MockDate from 'mockdate';
import { WebApiConfig } from '../controllers/web-api-config';
import { E2EScanFactories } from './e2e-scan-scenario-definitions';

describe('E2EScanScenarioDefinitions', () => {
    const availabilityConfig = {
        urlToScan: 'https://website.blob.core.windows.net/$web/',
        scanNotifyApiEndpoint: 'scan-notify-api-endpoint',
        scanNotifyFailApiEndpoint: 'scan-notify-fail-api-endpoint',
        consolidatedIdBase: 'consolidated-id-base',
    } as AvailabilityTestConfig;
    const webConfig: WebApiConfig = {
        baseUrl: 'base-url/',
        releaseId: 'test-release-version',
    };

    it('creates request options appropriately from given configs', () => {
        const fakeDate = new Date('1/1/2000');
        const expectedRequestOptions = [
            {
                authenticationType: 'bearerToken',
                scanNotificationUrl: 'base-url/scan-notify-api-endpoint',
            },
            {
                authenticationType: 'bearerToken',
                scanNotificationUrl: 'base-url/scan-notify-fail-api-endpoint',
                consolidatedId: `consolidated-id-base-test-release-version-consolidated-${fakeDate.getTime()}`,
                deepScanOptions: {
                    baseUrl: 'https://website.blob.core.windows.net/',
                    knownPages: [`https://website.blob.core.windows.net/$web/unlinked/index.html`],
                },
            },
            {
                authenticationType: 'bearerToken',
                deepScan: true,
                scanNotificationUrl: 'base-url/scan-notify-api-endpoint',
                consolidatedId: `consolidated-id-base-test-release-version-deepScan-${fakeDate.getTime()}`,
                deepScanOptions: {
                    baseUrl: 'https://website.blob.core.windows.net/',
                },
            },
            {
                authenticationType: 'bearerToken',
                deepScan: true,
                consolidatedId: `consolidated-id-base-test-release-version-deepScanKnownPages-${fakeDate.getTime()}`,
                deepScanOptions: {
                    baseUrl: 'https://website.blob.core.windows.net/',
                    knownPages: [`https://website.blob.core.windows.net/$web/unlinked/index.html`],
                },
            },
            {
                authenticationType: 'bearerToken',
                deepScan: true,
                consolidatedId: `consolidated-id-base-test-release-version-deepScanDiscoveryPatterns-${fakeDate.getTime()}`,
                deepScanOptions: {
                    baseUrl: 'https://website.blob.core.windows.net/',
                    discoveryPatterns: [`https://website.blob.core.windows.net/(.*)/linked1(.*)`],
                },
            },
            {
                authenticationType: 'bearerToken',
                consolidatedId: `consolidated-id-base-test-release-version-privacy-${fakeDate.getTime()}`,
                privacyScan: true,
            },
        ];

        MockDate.set(fakeDate);
        const definitions = E2EScanFactories.map((factory) => factory(availabilityConfig, webConfig));
        const requestOptions = definitions.map((d) => d.scanOptions);
        MockDate.reset();

        expect(requestOptions).toHaveLength(expectedRequestOptions.length);
        expectedRequestOptions.forEach((expectedOptions) => {
            expect(requestOptions).toContainEqual(expectedOptions);
        });
    });
});
