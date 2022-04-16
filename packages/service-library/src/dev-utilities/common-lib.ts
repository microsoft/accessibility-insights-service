// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Readable } from 'stream';
import fs from 'fs';
import * as nodeFetch from 'node-fetch';
import { BlobServiceClient } from '@azure/storage-blob';
import { EnvironmentCredential } from '@azure/identity';
import { BlobStorageClient } from 'azure-services';
import { BodyParser } from 'common';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable security/detect-non-literal-fs-filename */

export interface OAuthToken {
    access_token: string;
}

export interface OAuthOptions {
    oauthClientId: string;
    oauthResourceId: string;
    oauthClientSecret: string;
}

export async function getOAuthToken(options: OAuthOptions): Promise<string> {
    const url = `https://login.microsoftonline.com/microsoft.onmicrosoft.com/oauth2/token`;
    const httpRequest = createGetTokenHttpRequest(options);
    const httpResponse = await nodeFetch.default(url, httpRequest);
    await ensureHttpResponse(httpResponse);
    const body = await httpResponse.json();

    return (body as OAuthToken).access_token;
}

export async function ensureHttpResponse(response: nodeFetch.Response): Promise<void> {
    if (response.status < 200 || response.status > 299) {
        const body = await response.text();

        throw new Error(body);
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
    };
}

export async function downloadBlob<T>(accountName: string, blobContainerName: string, blobName: string): Promise<T> {
    const credential = new EnvironmentCredential();
    const blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, credential);
    const blobStorageClient = new BlobStorageClient(() => Promise.resolve(blobServiceClient));
    const blobContentStream = await blobStorageClient.getBlobContent(blobContainerName, blobName);

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

function createGetTokenHttpRequest(options: OAuthOptions): nodeFetch.RequestInit {
    const headers: nodeFetch.HeadersInit = {
        'Content-Type': 'application/x-www-form-urlencoded',
    };

    const body = `grant_type=client_credentials&client_id=${options.oauthClientId}&resource=${
        options.oauthResourceId
    }&client_secret=${encodeURI(options.oauthClientSecret)}`;

    return {
        method: 'POST',
        headers,
        body,
    };
}
