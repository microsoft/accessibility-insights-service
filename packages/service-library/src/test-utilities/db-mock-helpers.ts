// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable: no-unsafe-any no-any align no-constant-condition
import * as cosmos from '@azure/cosmos';
import { CosmosClientWrapper, CosmosOperationResponse } from 'azure-services';
import { HashGenerator } from 'common';
import * as crypto from 'crypto';
import * as _ from 'lodash';
import { BaseLogger, Logger } from 'logger';
import { ItemType, StorageDocument, Website, WebsitePage, WebsitePageExtra } from 'storage-documents';
import { IMock, Mock } from 'typemoq';
import { PageObjectFactory } from '../factories/page-object-factory';

export interface DbContainer {
    dbName: string;
    collectionName: string;
}

const warningMessage = `Warning: To use the Azure Cosmos DB based tests provide Cosmos DB Url and key.
        The Azure Cosmos DB or Azure Cosmos DB emulator https://aka.ms/cosmosdb-emulator (Windows only) can be used.`;
const cosmosDbUrl: string = undefined;
const cosmosDbKey: string = undefined;

export class DbMockHelper {
    public dbContainer: DbContainer;
    public cosmosClient: CosmosClientWrapper;
    private readonly pageFactory = new PageObjectFactory(new HashGenerator());
    private azureCosmosClient: cosmos.CosmosClient;
    private loggerMock: IMock<BaseLogger>;

    public isDbTestSupported(): boolean {
        if (cosmosDbUrl === undefined || cosmosDbKey === undefined) {
            console.log('\x1b[31m', warningMessage);

            return false;
        }

        return true;
    }

    public async init(dbName?: string, collectionName?: string): Promise<boolean> {
        this.dbContainer = {
            dbName: dbName === undefined ? 'test-db' : dbName,
            collectionName: collectionName === undefined ? this.createRandomString('col') : collectionName,
        };

        this.loggerMock = Mock.ofType<BaseLogger>();
        this.azureCosmosClient = new cosmos.CosmosClient({ endpoint: cosmosDbUrl, auth: { masterKey: cosmosDbKey } });
        this.cosmosClient = new CosmosClientWrapper(() => Promise.resolve(this.azureCosmosClient));

        await this.deleteDbContainer(this.dbContainer);
        await this.createDbContainer(this.dbContainer);

        return true;
    }

    public createPageDocument(options?: {
        label?: string;
        extra?: WebsitePageExtra;
        websiteId?: string;
        baseUrl?: string;
        url?: string;
    }): WebsitePage {
        const websiteId =
            options === undefined || options.websiteId === undefined ? this.createRandomString('websiteId') : options.websiteId;
        const baseUrl = options === undefined || options.baseUrl === undefined ? this.createBaseUrl() : options.baseUrl;
        const url = options === undefined || options.url === undefined ? this.createUrl(baseUrl) : options.url;
        const page = this.pageFactory.createImmutableInstance(websiteId, baseUrl, url);
        (<any>page).label = options === undefined || options.label === undefined ? undefined : options.label;

        if (options.extra !== undefined) {
            _.merge(page, options.extra);
        }

        return page;
    }

    public createWebsiteDocument(options?: {
        label?: string;
        websiteId?: string;
        baseUrl?: string;
        deepScanningEnabled?: boolean;
    }): Website {
        const website = {
            id: this.createRandomString('id'),
            itemType: ItemType.website,
            partitionKey: 'website',
            websiteId: options === undefined || options.websiteId === undefined ? this.createRandomString('websiteId') : options.websiteId,
            name: this.createRandomString('name'),
            baseUrl: options === undefined || options.baseUrl === undefined ? this.createBaseUrl() : options.baseUrl,
            serviceTreeId: this.createRandomString('serviceTreeId'),
        };
        (<any>website).label = options === undefined || options.label === undefined ? undefined : options.label;

        if (options !== undefined && options.deepScanningEnabled) {
            (<any>website).deepScanningEnabled = options.deepScanningEnabled;
        }

        return website;
    }

    public createDocument(itemType: ItemType = ItemType.website, id?: string, partitionKey?: string): StorageDocument {
        return {
            id: id === undefined ? this.createRandomString('id') : id,
            itemType: itemType,
            partitionKey: partitionKey === undefined ? this.createRandomString('pk') : partitionKey,
        };
    }

    public createRandomString(prefix: string = ''): string {
        return `${prefix}-${crypto.randomBytes(5).toString('hex')}`;
    }

    public createBaseUrl(): string {
        return `https://${this.createRandomString()}.localhost/`;
    }

    public createUrl(baseUrl: string): string {
        return `${baseUrl}page-${this.createRandomString()}.html`;
    }

    public async createDbContainer(container: DbContainer): Promise<DbContainer> {
        console.log(`Creating database '${container.dbName}..`);
        const dbResponse = await this.azureCosmosClient.databases.createIfNotExists({ id: container.dbName });
        const db = dbResponse.database;

        await this.waitForDbCreation(container.dbName);

        await db.containers.createIfNotExists(
            {
                id: container.collectionName,
                partitionKey: { paths: [CosmosClientWrapper.PARTITION_KEY_NAME], kind: cosmos.PartitionKind.Hash },
            },
            { offerThroughput: 1000 },
        );

        console.log('.created');

        console.log(`Cosmos container:
    DB: ${container.dbName}
    Collection: ${container.collectionName}`);

        return this.dbContainer;
    }

    public async waitForDbCreation(dbName: string): Promise<void> {
        this.sleep(2000);

        while (true) {
            try {
                await this.azureCosmosClient.database(dbName).read();
                break;
            } catch (error) {
                if ((<cosmos.ErrorResponse>error).code === 404) {
                    continue;
                }

                throw error;
            }
        }
    }

    public async deleteAllDocuments(): Promise<void> {
        const items = await this.cosmosClient.readAllItem(this.dbContainer.dbName, this.dbContainer.collectionName, this.loggerMock.object);

        await Promise.all(
            items.item.map(async item => {
                await this.cosmosClient.deleteItem(
                    item.id,
                    this.dbContainer.dbName,
                    this.dbContainer.collectionName,
                    item.partitionKey,
                    this.loggerMock.object,
                );
            }),
        );
    }

    public async upsertItem<T>(item: T): Promise<CosmosOperationResponse<T>> {
        return this.cosmosClient.upsertItem(item, this.dbContainer.dbName, this.dbContainer.collectionName, (<any>item).partitionKey);
    }

    public async upsertItems<T>(items: T[]): Promise<void> {
        await Promise.all(
            items.map(async item => {
                await this.upsertItem(item);
            }),
        );
    }

    public getDocumentProjections(documents: any[]): any[] {
        return documents.map(d => {
            return { id: d.id, label: d.label };
        });
    }

    private async deleteDbContainer(container: DbContainer): Promise<void> {
        try {
            console.log(`Deleting database '${container.dbName}..`);
            await this.azureCosmosClient.database(container.dbName).delete();
            this.sleep(2000);

            while (true) {
                try {
                    await this.azureCosmosClient.database(container.dbName).read();
                } catch (error) {
                    if ((<cosmos.ErrorResponse>error).code === 404) {
                        break;
                    }

                    throw error;
                }
            }
            console.log('.deleted');
        } catch (error) {
            if ((<cosmos.ErrorResponse>error).code !== 404) {
                throw error;
            }
        }
    }

    private sleep(time: number): void {
        const stop = new Date().getTime();
        let i = 0;
        while (new Date().getTime() < stop + time) {
            i = i + 1;
        }
    }
}
