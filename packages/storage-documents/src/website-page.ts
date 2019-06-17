// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { RunResult } from '.';
import { StorageDocument } from './storage-document';

/**
 * Defines core part of the page storage document.
 */
export interface WebsitePageBase extends StorageDocument {
    // Note: Read-only properties are not intended to be updated for the existing storage document
    readonly websiteId: string;
    readonly baseUrl: string;
    readonly url: string;
}

/**
 * Defines supplementation part of the page storage document.
 */
export interface WebsitePageExtra {
    basePage?: boolean;
    pageRank?: number;
    lastReferenceSeen?: string;
    lastRun?: RunResult;
    links?: string[];
}

/**
 * Describes the website page as part of the website map.
 * Intended to be use by scan orchestrator to schedule page scans.
 * May include metadata related to the page scan scheduling condition.
 *
 * The db document id is composed of a website base URL and a page URL to ensure
 * that only a single document present in database for the given website page.
 */
export interface WebsitePage extends WebsitePageBase, WebsitePageExtra {}
