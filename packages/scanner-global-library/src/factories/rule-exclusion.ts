// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';

@injectable()
export class RuleExclusion {
    public accessibilityRuleExclusionList = [
        'accesskeys',
        'aria-allowed-role',
        'aria-dialog-name',
        'aria-treeitem-name',
        'css-orientation-lock',
        'empty-heading',
        'focus-order-semantics',
        'form-field-multiple-labels',
        'frame-tested',
        'frame-title-unique',
        'heading-order',
        'hidden-content',
        'identical-links-same-purpose',
        'image-redundant-alt',
        'label-content-name-mismatch',
        'label-title-only',
        'landmark-banner-is-top-level',
        'landmark-complementary-is-top-level',
        'landmark-contentinfo-is-top-level',
        'landmark-main-is-top-level',
        'landmark-no-duplicate-banner',
        'landmark-no-duplicate-contentinfo',
        'landmark-no-duplicate-main',
        'landmark-one-main',
        'landmark-unique',
        'link-in-text-block',
        'meta-viewport',
        'meta-viewport-large',
        'no-autoplay-audio',
        'p-as-heading',
        'page-has-heading-one',
        'presentation-role-conflict',
        'region',
        'scope-attr-valid',
        'skip-link',
        'tabindex',
        'table-duplicate-name',
        'table-fake-caption',
        'td-has-header',
    ];
}
