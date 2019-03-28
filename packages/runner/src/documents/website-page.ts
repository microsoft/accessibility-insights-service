/**
 * Describes the website page as part of the website map.
 * Intended to be use by scan orchestrator to schedule page scans.
 * May include metadata related to the page scan scheduling condition.
 *
 * The db document id is composed of a website base URL and a page URL to ensure
 * that only a single document present in database for the given website page.
 */
export interface WebsitePage {
    id: string;
    page: {
        websiteId: string;
        url: string;
        lastSeen: string;
    };
}
