// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import type { Spec } from 'axe-core';

export type AxeConfiguration = Spec;

// This is copied verbatim from the built version of the @accessibility-insights/axe-config
// package in microsoft/accessibility-insights-web. It must be updated with each axe-core update
// and also to pick up any out-of-band rule customizations.
//
// In the future, it would be nice to publish that package and pick it up via NPM instead of
// copying it here. See https://github.com/microsoft/accessibility-insights-service/issues/571
const accessibilityInsightsWebAxeConfiguration = {
    runOnly: {
        type: 'rule',
        values: [
            'area-alt',
            'aria-allowed-attr',
            'aria-allowed-role',
            'aria-command-name',
            'aria-hidden-body',
            'aria-hidden-focus',
            'aria-input-field-name',
            'aria-meter-name',
            'aria-progressbar-name',
            'aria-required-attr',
            'aria-required-children',
            'aria-required-parent',
            'aria-roledescription',
            'aria-roles',
            'aria-toggle-field-name',
            'aria-tooltip-name',
            'aria-valid-attr-value',
            'aria-valid-attr',
            'audio-caption',
            'autocomplete-valid',
            'avoid-inline-spacing',
            'blink',
            'button-name',
            'bypass',
            'color-contrast',
            'definition-list',
            'dlitem',
            'document-title',
            'duplicate-id-active',
            'duplicate-id-aria',
            'frame-focusable-content',
            'frame-tested',
            'frame-title',
            'html-has-lang',
            'html-lang-valid',
            'html-xml-lang-mismatch',
            'image-alt',
            'input-button-name',
            'input-image-alt',
            'label',
            'link-in-text-block',
            'link-name',
            'list',
            'listitem',
            'marquee',
            'meta-refresh',
            'meta-viewport',
            'nested-interactive',
            'object-alt',
            'presentation-role-conflict',
            'role-img-alt',
            'select-name',
            'server-side-image-map',
            'svg-img-alt',
            'td-headers-attr',
            'th-has-data-cells',
            'valid-lang',
            'video-caption',
        ],
    },
    pingWaitTime: 1000,
};

export const cloudAxeConfiguration: AxeConfiguration = {
    ...accessibilityInsightsWebAxeConfiguration,

    // We allow this for our own cloud workers because we can verify *both* that they
    // only use isolated, non-privileged browser contexts *and* they run in a network
    // environment that does not contain any private endpoints which expose secrets.
    allowedOrigins: ['<unsafe_all_origins>'],
};

export const localAxeConfiguration: AxeConfiguration = {
    ...accessibilityInsightsWebAxeConfiguration,

    // Local cases still use isolated, non-privileged browser contexts, but they may
    // be running in an environment with sensitive local/network endpoints, so we don't
    // allow cross-origin scanning.
    allowedOrigins: ['<same_origin>'],
};
