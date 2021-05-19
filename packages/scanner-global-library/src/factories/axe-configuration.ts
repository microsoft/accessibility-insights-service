// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import type { Spec } from 'axe-core';

export type AxeConfiguration = Spec;

// Note that @axe-core/puppeteer version range ">= 4.2.0 < 4.3.0" does not support
// axe-core's allowedOrigins Spec property, which will cause these configurations to
// be *silently* misapplied.

export const cloudAxeConfiguration: AxeConfiguration = {
    // We allow this for our own cloud workers because we can verify *both* that they
    // only use isolated, non-privileged browser contexts *and* they run in a network
    // environment that does not contain any private endpoints which expose secrets.
    allowedOrigins: ['<unsafe_all_origins>'],
};

export const localAxeConfiguration: AxeConfiguration = {
    // Local cases still use isolated, non-privileged browser contexts, but they may
    // be running in an environment with sensitive local/network endpoints, so we don't
    // allow cross-origin scanning.
    allowedOrigins: ['<same_origin>'],
};
