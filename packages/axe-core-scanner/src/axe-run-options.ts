// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import type { RunOptions } from 'axe-core';

export type AxeRunOptions = RunOptions;

// This is copied verbatim from the built version of the @accessibility-insights/axe-config
// package in microsoft/accessibility-insights-web. It must be updated with each axe-core update
// and also to pick up any out-of-band rule customizations.
//
// In the future, it would be nice to publish that package and pick it up via NPM instead of
// copying it here. See https://github.com/microsoft/accessibility-insights-service/issues/571
export const webAxeRunOptions: AxeRunOptions = {
    runOnly: {
        type: 'rule',
        values: [
            'area-alt',
            'aria-allowed-attr',
            'aria-allowed-role',
            'aria-command-name',
            'aria-conditional-attr',
            'aria-deprecated-role',
            'aria-hidden-body',
            'aria-hidden-focus',
            'aria-input-field-name',
            'aria-meter-name',
            'aria-progressbar-name',
            'aria-prohibited-attr',
            'aria-required-attr',
            'aria-required-children',
            'aria-required-parent',
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
            'duplicate-id-aria',
            'frame-focusable-content',
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
            'scrollable-region-focusable',
            'select-name',
            'server-side-image-map',
            'summary-name',
            'svg-img-alt',
            'td-headers-attr',
            'th-has-data-cells',
            'valid-lang',
            'video-caption',
        ],
    },
    pingWaitTime: 1000,
};
