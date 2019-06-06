// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { RunResult } from '.';
import { StorageDocument } from './storage-document';

/**
 * Describes the website page as part of the website map.
 * Intended to be use by scan orchestrator to schedule page scans.
 * May include metadata related to the page scan scheduling condition.
 *
 * The db document id is composed of a website base URL and a page URL to ensure
 * that only a single document present in database for the given website page.
 */
export interface WebsitePage extends StorageDocument {
    websiteId: string;
    baseUrl: string;
    url: string;
    basePage?: boolean;
    pageRank: number;
    backlinkLastSeen: string;
    lastRun: RunResult;
}
