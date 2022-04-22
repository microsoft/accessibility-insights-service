// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export const puppeteerTimeoutConfig = {
    /**
     * Maximum wait time, in milliseconds, to scroll to the bottom of the page.
     */
    scrollTimeoutMsecs: 3000,

    /**
     * Maximum wait time, in milliseconds, to complete async rendering operations of the page.
     */
    pageRenderingTimeoutMsecs: 60000,

    /**
     * Maximum wait time, in milliseconds, to complete page navigation.
     * The total page navigation timeout should correlate with Batch scan task 'max wall-clock time' constrain
     * Refer to service configuration TaskRuntimeConfig.taskTimeoutInMinutes property
     */
    navigationTimeoutMsecs: 60000,
};
