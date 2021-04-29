// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';
import { AvailabilityTestConfig } from 'common';
import * as MockDate from 'mockdate';
import { WebApiConfig } from '../controllers/web-api-config';
import { E2EScanFactories } from './e2e-scan-scenario-definitions';

describe('E2EScanScenarioDefinitions', () => {
    const availabilityConfig = {
        urlToScan: 'url-to-scan/',
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
                scanNotificationUrl: 'base-url/scan-notify-api-endpoint',
            },
            {
                scanNotificationUrl: 'base-url/scan-notify-fail-api-endpoint',
                consolidatedId: `consolidated-id-base-test-release-version-consolidated-${fakeDate.getTime()}`,
            },
            {
                deepScan: true,
                scanNotificationUrl: 'base-url/scan-notify-api-endpoint',
                consolidatedId: `consolidated-id-base-test-release-version-deepScan-${fakeDate.getTime()}`,
            },
            {
                deepScan: true,
                consolidatedId: `consolidated-id-base-test-release-version-deepScanKnownPages-${fakeDate.getTime()}`,
                deepScanOptions: {
                    knownPages: [`url-to-scan/unlinked/`],
                },
            },
            {
                deepScan: true,
                consolidatedId: `consolidated-id-base-test-release-version-deepScanDiscoveryPatterns-${fakeDate.getTime()}`,
                deepScanOptions: {
                    discoveryPatterns: [`url-to-scan/linked1[.*]`],
                },
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
