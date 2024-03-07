// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { isEmpty } from 'lodash';
import { KnownPage, KnownPages } from './website-scan-result';
import { OnDemandPageScanRunState, ScanState } from './on-demand-page-scan-result';

/**
 * Compacts object {@link KnownPage} to a string in format `url|scanId|runState|scanState`
 */
export function convertKnownPageToString(knownPage: KnownPage): string {
    if (isEmpty(knownPage)) {
        return '';
    }

    const properties = [knownPage.url, knownPage.scanId, knownPage.runState, knownPage.scanState];
    const value = properties.join('|');

    // Remove separator chars at the end
    return value.replace(/(\|)+$/g, '');
}

/**
 * Expands a string in format `url|scanId|runState|scanState` to an object {@link KnownPage}
 */
export function convertStringToKnownPage(value: string): KnownPage {
    if (isEmpty(value)) {
        return undefined;
    }

    const knownPage = {} as KnownPage;
    const properties = value.split('|');

    for (let i = 0; i < properties.length; i++) {
        const property = properties[i];
        if (isEmpty(property)) {
            continue;
        }

        switch (i) {
            case 0:
                knownPage.url = property;
                break;
            case 1:
                knownPage.scanId = property;
                break;
            case 2:
                knownPage.runState = property as OnDemandPageScanRunState;
                break;
            case 3:
                knownPage.scanState = property as ScanState;
                break;
            default:
                throw new Error('String value does not match the expected format.');
        }
    }

    return knownPage;
}

export function convertObjectToKnownPages(knownPages: KnownPages): KnownPage[] {
    if (isEmpty(knownPages)) {
        return [];
    }

    return Object.keys(knownPages).map((hash) => convertStringToKnownPage((knownPages as KnownPages)[hash]));
}
