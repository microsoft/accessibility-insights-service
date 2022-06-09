// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface PageNavigationTiming {
    goto1: number;
    goto1Timeout: boolean;
    goto2: number;
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
     */
    navigationTimeoutMsecs: 20000,

    /**
     * Maximum wait time, in milliseconds, to complete async page rendering.
     */
    pageRenderingTimeoutMsecs: 20000,

    /**
     * The minimum time the HTML DOM should be stable to accept page rendering.
     */
    pageDomStableTimeMsecs: 3000,

    /**
     * Maximum wait time, in milliseconds, to scroll to the bottom of the page.
     */
    scrollTimeoutMsecs: 10000,
};
