// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { WebDriverCapabilities } from './web-driver';

export interface PageNavigationTiming {
    goto: number;
    gotoTimeout: boolean;
    scroll: number;
    scrollTimeout: boolean;
    htmlContent: number;
    htmlContentTimeout: boolean;
    render: number;
    renderTimeout: boolean;
}

/**
 * The total page navigation timeout should correlate with Batch scan task 'max wall-clock time' constrain.
 * Refer to service configuration TaskRuntimeConfig.taskTimeoutInMinutes property.
 */
@injectable()
export class PuppeteerTimeoutConfig {
    /**
     * Maximum wait time, in milliseconds, to load dynamic HTML content.
     */
    public static readonly pageHtmlContentTimeoutMsec: number = 20000;

    /**
     * Maximum wait time, in milliseconds, to complete page graphical rendering.
     */
    public static readonly pageRenderingTimeoutMsec: number = 60000;

    /**
     * The minimum time the HTML DOM should be stable to accept page rendering.
     */
    public static readonly pageDomStableDurationMsec: number = 1000;

    /**
     * Maximum wait time, in milliseconds, to scroll to the bottom of the page.
     *
     * Do not decrease scroll timeout as it will break accessibility scan for long pages.
     */
    public static readonly scrollTimeoutMsec: number = 30000;

    /**
     * Maximum wait time, in milliseconds, to complete page redirection.
     */
    public static readonly redirectTimeoutMsec: number = 10000;

    /**
     * WebGL requires a lot of resources and processing power from the machine, it may trigger
     * a navigation timeout error and stop the loading process. Need to adjust the navigation timeout
     * to allow more time for WebGL webpages to load.
     */
    public static readonly webglNavigationTimeoutMsec: number = 180000;

    public static readonly defaultNavigationTimeoutMsec: number = 60000;

    /**
     * Maximum wait time, in milliseconds, to complete page navigation.
     *
     * Puppeteer may render some webpage properly but timeout on page navigation when running in
     * headless mode. The {@link PageOperationHandler} will override puppeteer timeout error on
     * successful webserver response to mitigate this issue.
     */
    public navigationTimeoutMsec: number;

    constructor() {
        this.navigationTimeoutMsec = PuppeteerTimeoutConfig.defaultNavigationTimeoutMsec;
    }

    public setOperationTimeout(capabilities?: WebDriverCapabilities): void {
        this.navigationTimeoutMsec =
            capabilities?.webgl === true
                ? PuppeteerTimeoutConfig.webglNavigationTimeoutMsec
                : PuppeteerTimeoutConfig.defaultNavigationTimeoutMsec;
    }
}
