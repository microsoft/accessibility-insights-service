export interface WebsitePage {
    id: string;
    page: {
        websiteId: string;
        url: string;
        lastSeen: string;
    };
}
