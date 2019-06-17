// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable:no-require-imports no-var-requires variable-name no-submodule-imports function-name
import { CrawlerConnectOptions, CrawlerLaunchOptions, CrawlerResult, JSONLineExporterOptions } from './hc-crawler-types';

const headlessChromeCrawler = require('headless-chrome-crawler');
const jsonLineExporter = require('headless-chrome-crawler/exporter/json-line');

export declare class HCCrawlerTyped {
    public static launch(options: CrawlerLaunchOptions): Promise<HCCrawlerTyped>;

    public static connect(options: CrawlerConnectOptions): Promise<HCCrawlerTyped>;

    public close(): Promise<void>;

    public disconnect(): Promise<void>;

    public queue(url: string): Promise<void>;

    public onIdle(): Promise<void>;

    public on(eventName: string, callback: Function): void;

    public queueSize(): number;
}

export declare class JSONLineExporterTyped {
    constructor(options: JSONLineExporterOptions);

    public writeLine(result: CrawlerResult): void;

    public writeHeader(): void;

    public writeFooter(): void;

    public end(): void;

    public onEnd(): Promise<void>;
}

export const HCCrawler = headlessChromeCrawler as typeof HCCrawlerTyped;
export const JSONLineExporter = jsonLineExporter as typeof JSONLineExporterTyped;
