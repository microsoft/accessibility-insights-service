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
            'accesskeys',
            'area-alt',
            'aria-allowed-attr',
            'aria-allowed-role',
            'aria-braille-equivalent',
            'aria-command-name',
            'aria-conditional-attr',
            'aria-deprecated-role',
            'aria-dialog-name',
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
            'aria-text',
            'aria-toggle-field-name',
            'aria-tooltip-name',
            'aria-treeitem-name',
            'aria-valid-attr-value',
            'aria-valid-attr',
            'audio-caption',
            'autocomplete-valid',
            'avoid-inline-spacing',
            'blink',
            'button-name',
            'bypass',
            'color-contrast',
            'color-contrast-enhanced',
            'css-orientation-lock',
            'definition-list',
            'dlitem',
            'document-title',
            'duplicate-id-aria',
            'empty-heading',
            'empty-table-header',
            'focus-order-semantics',
            'form-field-multiple-labels',
            'frame-focusable-content',
            'frame-title-unique',
            'frame-tested',
            'frame-title',
            'heading-order',
            'hidden-content',
            'html-has-lang',
            'html-lang-valid',
            'html-xml-lang-mismatch',
            'identical-links-same-purpose',
            'image-alt',
            'image-redundant-alt',
            'input-button-name',
            'input-image-alt',
            'label',
            'label-content-name-mismatch',
            'label-title-only',
            'landmark-banner-is-top-level',
            'landmark-complementary-is-top-level',
            'landmark-contentinfo-is-top-level',
            'landmark-main-is-top-level',
            'landmark-no-duplicate-banner',
            'landmark-no-duplicate-contentinfo',
            'landmark-no-duplicate-main',
            'landmark-unique',
            'link-in-text-block',
            'link-name',
            'list',
            'listitem',
            'marquee',
            'meta-refresh',
            'meta-refresh-no-exceptions',
            'meta-viewport',
            'meta-viewport-large',
            'nested-interactive',
            'no-autoplay-audio',
            'object-alt',
            'p-as-heading',
            'page-has-heading-one',
            'presentation-role-conflict',
            'region',
            'role-img-alt',
            'scope-attr-valid',
            'scrollable-region-focusable',
            'select-name',
            'server-side-image-map',
            'skip-link',
            'summary-name',
            'svg-img-alt',
            'tabindex',
            'table-duplicate-name',
            'table-fake-caption',
            'target-size',
            'td-has-header',
            'td-headers-attr',
            'th-has-data-cells',
            'valid-lang',
            'video-caption',
        ],
    },
    pingWaitTime: 1000,
};
