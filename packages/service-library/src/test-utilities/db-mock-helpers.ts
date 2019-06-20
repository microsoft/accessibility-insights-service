// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable: no-unsafe-any no-any align no-constant-condition
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

export function createPageDocument(options?: {
    label?: string;
    extra?: WebsitePageExtra;
    websiteId?: string;
    baseUrl?: string;
    url?: string;
}): WebsitePage {
    const websiteId = options === undefined || options.websiteId === undefined ? createRandomString('id') : options.websiteId;
    const baseUrl = options === undefined || options.baseUrl === undefined ? createBaseUrl() : options.baseUrl;
    const url = options === undefined || options.url === undefined ? createUrl(baseUrl) : options.url;
    const page = pageFactory.createImmutableInstance(websiteId, baseUrl, url);
    (<any>page).label = options === undefined || options.label === undefined ? '' : options.label;

    if (options.extra !== undefined) {
        _.merge(page, options.extra);
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
    console.log(`Creating database '${container.dbName}..`);
    await cosmosClient.getContainer(container.dbName, container.collectionName);
    sleep(2000);

    while (true) {
        try {
            await azureCosmosClient.database(container.dbName).read();
            break;
        } catch (error) {
            if ((<cosmos.ErrorResponse>error).code === 404) {
                continue;
            }

            throw error;
        }
    }
    console.log('.created');

    console.log(`Cosmos container:
    DB: ${container.dbName}
    Collection: ${container.collectionName}`);

    return dbContainer;
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

export function getDocumentProjection(item: any): any {
    return {
        id: item.id,
        label: item.label,
    };
}

export function sleep(time: number): void {
    const stop = new Date().getTime();
    let i = 0;
    while (new Date().getTime() < stop + time) {
        i = i + 1;
    }
}
