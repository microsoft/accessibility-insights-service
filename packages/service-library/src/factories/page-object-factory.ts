// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { ItemType, RunResult, WebsitePage } from 'storage-documents';
import { HashGenerator } from '..';

@injectable()
export class PageObjectFactory {
    public constructor(@inject(HashGenerator) private readonly hashGenerator: HashGenerator) {}

    /**
     * Creates page document instance with immutable properties defined.
     *
     * @param websiteId The website ID
     * @param baseUrl The website base URL
     * @param scanUrl The page URL
     */
    public createImmutableInstance(websiteId: string, baseUrl: string, scanUrl: string): WebsitePage {
        const id = this.hashGenerator.getWebsitePageDocumentId(baseUrl, scanUrl);

        // NOTE: Any property with undefined value will override its corresponding storage document property value.
        return {
            id: id,
            itemType: ItemType.page,
            websiteId: websiteId,
            baseUrl: baseUrl,
            url: scanUrl,
            pageRank: <number>undefined,
            lastReferenceSeen: <string>undefined,
            lastRun: <RunResult>undefined,
            links: undefined,
            partitionKey: websiteId,
        };
    }
}
