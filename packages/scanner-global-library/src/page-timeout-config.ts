// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface PageNavigationTiming {
    goto: number;
    gotoTimeout: boolean;
    networkIdle: number;
    networkIdleTimeout: boolean;
    scroll: number;
    scrollTimeout: boolean;
    render: number;
    renderTimeout: boolean;
}

/**
 * The total page navigation timeout should correlate with Batch scan task 'max wall-clock time' constrain.
 * Refer to service configuration TaskRuntimeConfig.taskTimeoutInMinutes property.
 */
export const puppeteerTimeoutConfig = {
    /**
     * Maximum wait time, in milliseconds, to complete page navigation.
     *
     * Puppeteer may render some webpage properly but timeout on page navigation when running in
     * headless mode. The {@link PageOperationHandler} will override puppeteer timeout error on
     * successful webserver response to mitigate this issue.
     * WebGL requires a lot of resources and processing power from the machine, it may trigger
     * a navigation timeout error and stop the loading process. Need to adjust the navigation timeout
     * to allow more time for WebGL webpages to load.
     */
    navigationTimeoutMsec: 150000,

    /**
     * Maximum wait time, in milliseconds, to complete async page rendering.
     */
    pageRenderingTimeoutMsec: 20000,

    /**
     * The minimum time the HTML DOM should be stable to accept page rendering.
     */
    pageDomStableTimeMsec: 1000,

    /**
     * Maximum wait time, in milliseconds, to scroll to the bottom of the page.
     *
     * Do not decrease scroll timeout as it will break accessibility scan for long pages.
     */
    scrollTimeoutMsec: 30000,

    /**
     * Maximum wait time, in milliseconds, to complete page redirection.
     */
    redirectTimeoutMsec: 10000,
};
