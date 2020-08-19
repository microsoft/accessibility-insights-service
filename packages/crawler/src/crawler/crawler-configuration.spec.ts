// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { CrawlerConfiguration } from './crawler-configuration';

class TestableCrawlerConfiguration extends CrawlerConfiguration {
    public createPageProcessor(): CrawlerConfiguration {
        return undefined;
    }

    // Override to access protected method

    // tslint:disable-next-line: no-unnecessary-override
    public getDiscoveryPattern(baseUrl: string, discoveryPatterns: string[]): string[] {
        return super.getDiscoveryPattern(baseUrl, discoveryPatterns);
    }
}

describe(CrawlerConfiguration, () => {
    let pageProcessorFactory: TestableCrawlerConfiguration;

    beforeEach(() => {
        pageProcessorFactory = new TestableCrawlerConfiguration();
    });

    describe('getDiscoveryPattern', () => {
        const host = 'hostname.com';
        const path = '/path/to/page';
        let baseUrl: string;

        beforeEach(() => {
            baseUrl = `https://${host}${path}`;
        });

        it('with no list provided', () => {
            const expectedPattern = `http[s?]://${host}${path}[.*]`;

            const discoveryPatterns = pageProcessorFactory.getDiscoveryPattern(baseUrl, undefined);

            expect(discoveryPatterns.length).toBe(1);
            expect(discoveryPatterns[0]).toBe(expectedPattern);
        });

        it('with list provided', () => {
            const expectedDiscoveryPatterns = ['pattern1', 'pattern2'];

            const discoveryPatterns = pageProcessorFactory.getDiscoveryPattern(baseUrl, expectedDiscoveryPatterns);

            expect(discoveryPatterns).toBe(expectedDiscoveryPatterns);
        });
    });
});
