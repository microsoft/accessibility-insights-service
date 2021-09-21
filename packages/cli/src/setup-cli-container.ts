// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Crawler, setupLocalCrawlerContainer } from 'accessibility-insights-crawler';
import Ajv from 'ajv';
import * as inversify from 'inversify';
import { setupLocalScannerContainer } from 'scanner-global-library';
import { iocTypes } from './ioc-types';

export function setupCliContainer(
    container: inversify.Container = new inversify.Container({ autoBindInjectable: true }),
): inversify.Container {
    setupLocalScannerContainer(container);
    setupLocalCrawlerContainer(container);
    container.bind(Crawler).toConstantValue(new Crawler(container));
    container.bind(iocTypes.ajv).toConstantValue(new Ajv({ allErrors: true }));

    return container;
}
