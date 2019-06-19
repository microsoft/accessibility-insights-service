// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable: no-unsafe-any no-any
import * as cosmos from '@azure/cosmos';
import { CosmosClientWrapper, CosmosOperationResponse } from 'azure-services';
import { HashGenerator } from 'common';
import * as crypto from 'crypto';
import * as _ from 'lodash';
import { ItemType, StorageDocument, WebsitePage, WebsitePageExtra } from 'storage-documents';
import { PageObjectFactory } from '../factories/page-object-factory';

export interface DbContainer {
    dbName: string;
    collectionName: string;
}

const cosmosDbUrl = 'https://allycosmosafwl4qhutktlu.documents.azure.com:443/';
const cosmosDbKey = 'Zn8qsUKCCtelXpW5xHGludP7JO6uBDz4hEYHeuWObjGiNK4HKmUNsxVtK8gYFQCzFRY9SmE3NQ62zMrahh4bjg==';

export let dbContainer: DbContainer;
const azureCosmosClient = new cosmos.CosmosClient({ endpoint: cosmosDbUrl, auth: { masterKey: cosmosDbKey } });
export const cosmosClient = new CosmosClientWrapper(() => Promise.resolve(azureCosmosClient));
const pageFactory = new PageObjectFactory(new HashGenerator());

export async function init(dbName?: string, collectionName?: string): Promise<void> {
    dbContainer = {
        dbName: dbName === undefined ? createRandomString('db') : dbName,
        collectionName: collectionName === undefined ? createRandomString('col') : collectionName,
    };
    await deleteDbContainer(dbContainer);
    await createDbContainer(dbContainer);
}

export function createPageDocument(propertiesToSet?: WebsitePageExtra, websiteId?: string, baseUrl?: string, url?: string): WebsitePage {
    const websiteIdLoc = websiteId === undefined ? createRandomString('id') : websiteId;
    const baseUrlLoc = baseUrl === undefined ? createBaseUrl() : baseUrl;
    const urlLoc = url === undefined ? createUrl(baseUrlLoc) : url;
    const page = pageFactory.createImmutableInstance(websiteIdLoc, baseUrlLoc, urlLoc);

    if (propertiesToSet !== undefined) {
        _.merge(page, propertiesToSet);
    }

    return page;
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
    await cosmosClient.getContainer(container.dbName, container.collectionName);
    console.log(`
Cosmos container:
    DB: ${container.dbName}
    Collection: ${container.collectionName}
`);

    return dbContainer;
}

export async function deleteDbContainer(storage: DbContainer): Promise<void> {
    try {
        await azureCosmosClient.database(storage.dbName).delete();
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
