// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Crawler, setupCrawlerContainer } from 'accessibility-insights-crawler';
import Ajv from 'ajv';
import * as inversify from 'inversify';
import { iocTypes } from './ioc-types';

export function setupCliContainer(
    container: inversify.Container = new inversify.Container({ autoBindInjectable: true }),
): inversify.Container {
    setupCrawlerContainer(container);
    container.bind(Crawler).toConstantValue(new Crawler(container));
    container.bind(iocTypes.ajv).toConstantValue(new Ajv({ allErrors: true }));

    return container;
}
