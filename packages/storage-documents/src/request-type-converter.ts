// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { isEmpty } from 'lodash';
import { BrowserValidationResult, BrowserValidationTypes } from './on-demand-page-scan-result';

export function convertToBrowserValidationResult(browserValidationTypes: BrowserValidationTypes[]): BrowserValidationResult {
    if (isEmpty(browserValidationTypes)) {
        return undefined;
    }

    let browserValidationResult = {};
    if (browserValidationTypes.includes('highContrastProperties')) {
        browserValidationResult = { ...browserValidationResult, highContrastProperties: 'pending' };
    }

    return isEmpty(browserValidationResult) ? undefined : browserValidationResult;
}

export function convertToBrowserValidationTypes(browserValidationResult: BrowserValidationResult): BrowserValidationTypes[] {
    if (isEmpty(browserValidationResult)) {
        return undefined;
    }

    const browserValidationTypes: BrowserValidationTypes[] = [];
    if (!isEmpty(browserValidationResult.highContrastProperties)) {
        browserValidationTypes.push('highContrastProperties');
    }

    return isEmpty(browserValidationTypes) ? undefined : browserValidationTypes;
}
