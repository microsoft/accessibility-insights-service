// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Crawler, setupCrawlerContainer, DbScanResultReader } from 'accessibility-insights-crawler';
import * as inversify from 'inversify';
import { iocTypes } from './ioc-types';
import { ScanArguments } from './scanner/scan-arguments';
import { FileScanResultReader } from './scan-result-providers/file-scan-result-reader';
import { ScanResultReader } from './scan-result-providers/scan-result-reader';

export function setupCliContainer(): inversify.Container {
    const container = new inversify.Container({ autoBindInjectable: true });
    setupCrawlerContainer(container);
    container.bind(Crawler).toConstantValue(new Crawler(container));

    container
        .bind<inversify.interfaces.Factory<ScanResultReader>>(iocTypes.ScanResultReaderFactory)
        .toFactory<ScanResultReader>((context: inversify.interfaces.Context) => {
            const runOptions = context.container.get<ScanArguments>(iocTypes.RunOptions);

            return () => {
                if (runOptions.crawl) {
                    return context.container.get(DbScanResultReader);
                } else if (runOptions.inputFile) {
                    return context.container.get(FileScanResultReader);
                } else {
                    return undefined;
                }
            };
        });

    return container;
}

export function registerRunOptions(container: inversify.Container, scanArguments: ScanArguments): void {
    container.bind(iocTypes.RunOptions).toConstantValue(scanArguments);
}
