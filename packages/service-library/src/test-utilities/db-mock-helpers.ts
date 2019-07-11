// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable: no-unsafe-any no-any align no-constant-condition
import * as cosmos from '@azure/cosmos';
import { CosmosClientWrapper, CosmosOperationResponse } from 'azure-services';
import { HashGenerator } from 'common';
import * as crypto from 'crypto';
import * as _ from 'lodash';
import { ItemType, StorageDocument, Website, WebsitePage, WebsitePageExtra } from 'storage-documents';
import { PageObjectFactory } from '../factories/page-object-factory';

export interface DbContainer {
    dbName: string;
    collectionName: string;
}

export let dbContainer: DbContainer;
export let cosmosClient: CosmosClientWrapper;

const warningMessage = `Warning: To use the Azure Cosmos DB based tests provide Cosmos DB Url and key.
    The Azure Cosmos DB or Azure Cosmos DB emulator https://aka.ms/cosmosdb-emulator (Windows only) can be used.`;

const cosmosDbUrl: string = undefined;
const cosmosDbKey: string = undefined;

const pageFactory = new PageObjectFactory(new HashGenerator());
let azureCosmosClient: cosmos.CosmosClient;

export function isDbTestSupported(): boolean {
    if (cosmosDbUrl === undefined || cosmosDbKey === undefined) {
        console.log('\x1b[31m', warningMessage);

        return false;
    }

    return true;
}

export async function init(dbName?: string, collectionName?: string): Promise<boolean> {
    dbContainer = {
        dbName: dbName === undefined ? 'test-db' : dbName,
        collectionName: collectionName === undefined ? createRandomString('col') : collectionName,
    };

    azureCosmosClient = new cosmos.CosmosClient({ endpoint: cosmosDbUrl, auth: { masterKey: cosmosDbKey } });
    cosmosClient = new CosmosClientWrapper(() => Promise.resolve(azureCosmosClient));

    await deleteDbContainer(dbContainer);
    await createDbContainer(dbContainer);

    return true;
}

export function createPageDocument(options?: {
    label?: string;
    extra?: WebsitePageExtra;
    websiteId?: string;
    baseUrl?: string;
    url?: string;
}): WebsitePage {
    const websiteId = options === undefined || options.websiteId === undefined ? createRandomString('websiteId') : options.websiteId;
    const baseUrl = options === undefined || options.baseUrl === undefined ? createBaseUrl() : options.baseUrl;
    const url = options === undefined || options.url === undefined ? createUrl(baseUrl) : options.url;
    const page = pageFactory.createImmutableInstance(websiteId, baseUrl, url);
    (<any>page).label = options === undefined || options.label === undefined ? undefined : options.label;

    if (options.extra !== undefined) {
        _.merge(page, options.extra);
    }

    return page;
}

export function createWebsiteDocument(options?: { label?: string; websiteId?: string; baseUrl?: string }): Website {
    const website = {
        id: createRandomString('id'),
        itemType: ItemType.website,
        partitionKey: 'website',
        websiteId: options === undefined || options.websiteId === undefined ? createRandomString('websiteId') : options.websiteId,
        name: createRandomString('name'),
        baseUrl: options === undefined || options.baseUrl === undefined ? createBaseUrl() : options.baseUrl,
        serviceTreeId: createRandomString('serviceTreeId'),
    };
    (<any>website).label = options === undefined || options.label === undefined ? undefined : options.label;

    return website;
}

export function createDocument(itemType: ItemType = ItemType.website, id?: string, partitionKey?: string): StorageDocument {
    return {
        id: id === undefined ? createRandomString('id') : id,
        itemType: itemType,
        partitionKey: partitionKey === undefined ? createRandomString('pk') : partitionKey,
    };
}

export function createRandomString(prefix: string = ''): string {
    return `${prefix}-${crypto.randomBytes(5).toString('hex')}`;
}

export function createBaseUrl(): string {
    return `https://${createRandomString()}.localhost/`;
}

export function createUrl(baseUrl: string): string {
    return `${baseUrl}page-${createRandomString()}.html`;
}

export async function createDbContainer(container: DbContainer): Promise<DbContainer> {
    console.log(`Creating database '${container.dbName}..`);
    const dbResponse = await azureCosmosClient.databases.createIfNotExists({ id: container.dbName });
    const db = dbResponse.database;

    await waitForDbCreation(container.dbName);

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

    return dbContainer;
}

async function waitForDbCreation(dbName: string): Promise<void> {
    sleep(2000);

    while (true) {
        try {
            await azureCosmosClient.database(dbName).read();
            break;
        } catch (error) {
            if ((<cosmos.ErrorResponse>error).code === 404) {
                continue;
            }

            throw error;
        }
    }
}

export async function deleteDbContainer(container: DbContainer): Promise<void> {
    try {
        console.log(`Deleting database '${container.dbName}..`);
        await azureCosmosClient.database(container.dbName).delete();
        sleep(2000);

        while (true) {
            try {
                await azureCosmosClient.database(container.dbName).read();
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

export async function upsertItem<T>(item: T): Promise<CosmosOperationResponse<T>> {
    return cosmosClient.upsertItem(item, dbContainer.dbName, dbContainer.collectionName, (<any>item).partitionKey);
}

export async function upsertItems<T>(items: T[]): Promise<void> {
    await Promise.all(
        items.map(async item => {
            await upsertItem(item);
        }),
    );
}

export function getDocumentLabels(documents: any[]): any[] {
    return documents.map(d => d.label);
}

export function sleep(time: number): void {
    const stop = new Date().getTime();
    let i = 0;
    while (new Date().getTime() < stop + time) {
        i = i + 1;
    }
}
