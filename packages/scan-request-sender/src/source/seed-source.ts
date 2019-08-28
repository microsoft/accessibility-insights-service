// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-unsafe-any
import { client, CosmosContainerClient, cosmosContainerClientTypes } from 'azure-services';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { ScanRequest, WebSite } from '../request-type/website';

@injectable()
export class SeedSource {
    constructor(
        @inject(cosmosContainerClientTypes.A11yIssuesCosmosContainerClient) private readonly cosmosContainerClient: CosmosContainerClient,
        @inject(Logger) private readonly logger: Logger,
    ) {}

    public async getWebSites(): Promise<WebSite[]> {
        const response = await this.cosmosContainerClient.readAllDocument<ScanRequest>();
        client.ensureSuccessStatusCode(response);
        if (response.item.length > 0) {
            this.logger.logInfo(`[Sender] retrieve ${response.item[0].websites.length} website documents`);
            response.item[0].websites.forEach(site => {
                site.scanUrl = site.baseUrl;
            });

            return response.item[0].websites;
        } else {
            throw new Error(`There is no source website document exists`);
        }
    }
}
