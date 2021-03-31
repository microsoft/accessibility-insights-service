// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AvailabilityTestConfig } from 'common';
import { WebApiConfig } from '../controllers/web-api-config';
import { E2EScanFactories } from './e2e-scan-scenario-definitions';

describe('E2EScanScenarioDefinitions', () => {
    const availabilityConfig = {
        urlToScan: 'url-to-scan',
        scanNotifyApiEndpoint: 'scan-notify-api-endpoint',
        scanNotifyFailApiEndpoint: 'scan-notify-fail-api-endpoint',
        consolidatedIdBase: 'consolidated-id-base',
    } as AvailabilityTestConfig;
    const webConfig: WebApiConfig = {
        baseUrl: 'base-url/',
    };

    it('creates request options appropriately from given configs', () => {
        process.env.RELEASE_VERSION = 'test-release-version';
        const definitions = E2EScanFactories.map((factory) => factory(availabilityConfig, webConfig));
        const requestOptions = definitions.map((d) => d.requestOptions);
        expect(requestOptions).toEqual([
            {
                urlToScan: 'url-to-scan',
                scanNotificationUrl: 'base-url/scan-notify-api-endpoint',
            },
            {
                urlToScan: 'url-to-scan',
                scanNotificationUrl: 'base-url/scan-notify-fail-api-endpoint',
                consolidatedId: 'consolidated-id-base-test-release-version',
            },
        ]);
    });
});
