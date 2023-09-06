// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export const puppeteerTimeoutConfig = {
    /**
     * Maximum wait time, in milliseconds, to complete page navigation.
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
};
