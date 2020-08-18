// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { PageProcessor, PageProcessorOptions } from './page-processor-base';
import { PageProcessorFactoryBase } from './page-processor-factory';

class TestablePageProcessorFactory extends PageProcessorFactoryBase {
    public createPageProcessor(pageProcessorOptions: PageProcessorOptions): PageProcessor {
        return undefined;
    }

    // Override to access protected method

    // tslint:disable-next-line: no-unnecessary-override
    public getDiscoveryPattern(baseUrl: string, discoveryPatterns: string[]): string[] {
        return super.getDiscoveryPattern(baseUrl, discoveryPatterns);
    }
}

describe(PageProcessorFactoryBase, () => {
    let pageProcessorFactory: TestablePageProcessorFactory;

    beforeEach(() => {
        pageProcessorFactory = new TestablePageProcessorFactory();
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
