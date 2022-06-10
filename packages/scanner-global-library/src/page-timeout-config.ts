// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface PageNavigationTiming {
    goto1: number;
    goto1Timeout: boolean;
    goto2: number;
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
     * Puppeteer will not render page properly and timeout on page.goto() when running headless
     * in docker. Hence do not increase this value as it will not mitigate navigation timeout error.
     */
    navigationTimeoutMsecs: 20000,

    /**
     * Maximum wait time, in milliseconds, to wait when network is idle.
     */
    networkIdleTimeoutMsec: 40000,

    /**
     * Maximum wait time, in milliseconds, to complete async page rendering.
     */
    pageRenderingTimeoutMsecs: 15000,

    /**
     * The minimum time the HTML DOM should be stable to accept page rendering.
     */
    pageDomStableTimeMsecs: 1000,

    /**
     * Maximum wait time, in milliseconds, to scroll to the bottom of the page.
     */
    scrollTimeoutMsecs: 15000,
};
