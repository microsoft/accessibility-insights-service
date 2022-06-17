// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Readable } from 'stream';
import fs from 'fs';
import https from 'https';
import * as nodeFetch from 'node-fetch';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { EnvironmentCredential } from '@azure/identity';
import { BlobStorageClient, BlobContentDownloadResponse } from 'azure-services';
import { BodyParser, System } from 'common';
import { isEmpty } from 'lodash';
import { backOff, IBackOffOptions } from 'exponential-backoff';
import { Mutex } from 'async-mutex';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable security/detect-non-literal-fs-filename */

const mutex = new Mutex();

const backOffOptions: Partial<IBackOffOptions> = {
    delayFirstAttempt: false,
    numOfAttempts: 5,
    maxDelay: 6000,
    startingDelay: 0,
    retry: (error, retry) => {
        console.log(`Retrying error ${retry} time: `, System.serializeError(error));

        return true;
    },
};

const httpsAgent = new https.Agent({ keepAlive: true });

export interface OAuthToken {
    access_token: string;
}

export async function executeExclusive<T>(fn: () => Promise<T>): Promise<T> {
    return mutex.runExclusive(async () => fn());
}

export async function executeBatchInChunkExclusive<T>(
    fn: (batch: any[]) => Promise<void | T[]>,
    items: any[],
    batchSize: number = 20,
): Promise<(void | T)[]> {
    let batchCount = 1;
    const itemsChunks = System.chunkArray(items, batchSize);
    const result = await Promise.all(
        itemsChunks.map(async (batch) => {
            return executeExclusive(async () => {
                console.log(`Processing batch ${batchCount} of ${itemsChunks.length}`);
                batchCount += 1;

                return fn(batch);
            });
        }),
    );

    return result.flat();
}

export async function executeWithExpRetry<T>(fn: () => Promise<T>): Promise<T> {
    return backOff(async () => {
        try {
            return fn();
        } catch (error) {
            console.log('Error: ', System.serializeError(error));
            throw error;
        }
    }, backOffOptions);
}

export async function getOAuthToken(oauthResourceId: string, oauthClientId: string, oauthClientSecret: string): Promise<string> {
    const url = `https://login.microsoftonline.com/mspmecloud.onmicrosoft.com/oauth2/token`;
    const httpRequest = createGetTokenHttpRequest(oauthResourceId, oauthClientId, oauthClientSecret);
    const httpResponse = await nodeFetch.default(url, httpRequest);
    await ensureHttpResponse(httpResponse);
    const body = await httpResponse.json();

    return (body as OAuthToken).access_token;
}

export async function ensureHttpResponse(response: nodeFetch.Response): Promise<void> {
    if (response.status < 200 || response.status > 299) {
        const body = await response.text();

        throw new Error(`HTTP request has failed. Status code: ${response.status} Response: ${body}`);
    }
}

export function createGetHttpRequest(token: string): nodeFetch.RequestInit {
    const headers: nodeFetch.HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    };

    return {
        method: 'GET',
        headers,
        agent: httpsAgent,
    };
}

export function createGetHttpRequestForWebsec(appKey: string): nodeFetch.RequestInit {
    const headers: nodeFetch.HeadersInit = {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': appKey,
    };

    return {
        method: 'GET',
        headers,
        agent: httpsAgent,
    };
}

export function createPostHttpRequest(bodyObj: any, token: string): nodeFetch.RequestInit {
    const headers: nodeFetch.HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    };
    const body = JSON.stringify(bodyObj);

    return {
        method: 'POST',
        headers,
        body,
        agent: httpsAgent,
    };
}

export async function downloadBlob<T>(accountName: string, blobContainerName: string, blobName: string, accountKey?: string): Promise<T> {
    let blobServiceClient: BlobServiceClient;
    if (isEmpty(accountKey)) {
        const credential = new EnvironmentCredential();
        blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, credential);
    } else {
        const sharedKey = new StorageSharedKeyCredential(accountName, accountKey);
        blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, sharedKey);
    }

    const blobStorageClient = new BlobStorageClient(() => Promise.resolve(blobServiceClient));
    const blobContentStream = await executeWithExpRetry<BlobContentDownloadResponse>(async () =>
        blobStorageClient.getBlobContent(blobContainerName, blobName),
    );

    if (blobContentStream.notFound) {
        return undefined;
    }

    const bodyParser = new BodyParser();
    const blobContent = (await bodyParser.getRawBody(blobContentStream.content as Readable)).toString();

    return JSON.parse(blobContent) as T;
}

export function writeToFile(data: any, folderName: string, fileName: string): void {
    if (!fs.existsSync(folderName)) {
        fs.mkdirSync(folderName);
    }

    const content = typeof data === 'string' ? data : JSON.stringify(data, undefined, '    ');
    const filePath = `${folderName}/${fileName}.json`;
    fs.writeFileSync(filePath, content);
}

function createGetTokenHttpRequest(oauthResourceId: string, oauthClientId: string, oauthClientSecret: string): nodeFetch.RequestInit {
    const headers: nodeFetch.HeadersInit = {
        'Content-Type': 'application/x-www-form-urlencoded',
    };

    const body = `grant_type=client_credentials&client_id=${oauthClientId}&resource=${oauthResourceId}&client_secret=${encodeURI(
        oauthClientSecret,
    )}`;

    return {
        method: 'POST',
        headers,
        body,
        agent: httpsAgent,
    };
}
