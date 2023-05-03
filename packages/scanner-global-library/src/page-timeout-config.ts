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
     * successful webserver response to mitigate this issue. Hence do not increase navigation timeout
     * value as it will not mitigate puppeteer navigation timeout error.
     */
    navigationTimeoutMsec: 30000,

    /**
     * Maximum wait time, in milliseconds, to wait when network is idle.
     */
    networkIdleTimeoutMsec: 25000,

    /**
     * Maximum wait time, in milliseconds, to complete async page rendering.
     */
    pageRenderingTimeoutMsec: 15000,

    /**
     * The minimum time the HTML DOM should be stable to accept page rendering.
     */
    pageDomStableTimeMsec: 1000,

    /**
     * Maximum wait time, in milliseconds, to scroll to the bottom of the page.
     */
    scrollTimeoutMsec: 30000,

    /**
     * Maximum wait time, in milliseconds, to complete page redirection.
     */
    redirectTimeoutMsec: 10000,
};
