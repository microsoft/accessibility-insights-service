// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-any
import { RunState, WebsitePage } from 'storage-documents';
import { CosmosClientWrapper } from '../azure-cosmos/cosmos-client-wrapper';
import { CosmosOperationResponse } from '../azure-cosmos/cosmos-operation-response';
export class PageDocumentProvider {
    constructor(
        private readonly cosmosClientWrapper: CosmosClientWrapper,
        private readonly dbName: string,
        private readonly collectionName: string,
    ) {}
    public async getReadyToScanPages(): Promise<CosmosOperationResponse<WebsitePage[]>> {
        const querySpec = {
            query: 'SELECT * FROM c WHERE c.itemType = @itemType and c.lastRunState.state = @state',
            parameters: [
                {
                    name: '@itemType',
                    value: 'page',
                },
                {
                    name: '@state',
                    value: RunState.completed,
                },
            ],
        };

        return this.cosmosClientWrapper.readItems(this.dbName, this.collectionName, querySpec);
    }
}
