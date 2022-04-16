// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import fs from 'fs';
import yargs from 'yargs';
import { System, HashGenerator } from 'common';
import * as dotenv from 'dotenv';
import pLimit from 'p-limit';
import { PrivacyMetadata, UrlValidation } from './wcp-types';
import { downloadBlob, writeToFile } from './common-lib';

/* eslint-disable @typescript-eslint/no-explicit-any, security/detect-non-literal-fs-filename */

interface ClientArgs {
    azureTenantId: string;
    azureClientId: string;
    azureClientSecret: string;
    dataFolder: string;
    metadataFile: string;
    azureStorageName: string;
    azureBlobContainerName: string;
}

const maxConcurrencyLimit = 1;

let clientArgs: ClientArgs;
const hashGenerator = new HashGenerator();
const getDataFolderName = () => `${__dirname}/${clientArgs.dataFolder}`;
const getMetadataFileName = () => `${getDataFolderName()}/${clientArgs.metadataFile}`;

async function main(): Promise<void> {
    clientArgs = getClientArguments();
    cleanup();
    await exportScanResult();
}

async function exportScanResult(): Promise<void> {
    const privacyMetadata = readMetadataFile();
    await parsePrivacyMetadata(privacyMetadata);
}

async function parsePrivacyMetadata(privacyMetadata: PrivacyMetadata[]): Promise<void> {
    const asyncLimit = pLimit(maxConcurrencyLimit);
    await Promise.all(
        await asyncLimit(async () => {
            return privacyMetadata.map(async (metadata) => {
                const urlValidation = await downloadPrivacyBlob(metadata.ValidationResultBlobName);
                appendUrlToList(urlValidation);
                writeUrlValidation(urlValidation);
                console.log(`Parsed website validation for ${metadata.Name}`);
            });
        }),
    );
}

async function downloadPrivacyBlob(blobName: string): Promise<UrlValidation[]> {
    const blob = await downloadBlob<UrlValidation[]>(clientArgs.azureStorageName, clientArgs.azureBlobContainerName, blobName);
    if (blob === undefined) {
        console.log(`The blob '${blobName}' not found.`);

        return undefined;
    }

    return blob;
}

function appendUrlToList(urlValidation: UrlValidation[]): void {
    if (!fs.existsSync(getDataFolderName())) {
        fs.mkdirSync(getDataFolderName());
    }

    const filePath = `${getDataFolderName()}/urls.txt`;
    urlValidation.map((validation) => {
        fs.appendFileSync(filePath, `${validation.Url}\n`);
    });
}

function readMetadataFile(): PrivacyMetadata[] {
    if (!fs.existsSync(getMetadataFileName())) {
        console.log(`File not found ${getMetadataFileName()}`);

        return [];
    }

    return JSON.parse(fs.readFileSync(getMetadataFileName(), { encoding: 'utf-8' })) as PrivacyMetadata[];
}

function writeUrlValidation(urlValidation: UrlValidation[]): void {
    urlValidation.map((validation) => {
        const urlHash = hashGenerator.generateBase64Hash(validation.Url);
        writeToFile(validation, getDataFolderName(), `${urlHash}.validation`);
    });
}

function cleanup(): void {
    const filePath = `${getDataFolderName()}/urls.txt`;
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

function getClientArguments(): ClientArgs {
    return yargs
        .env()
        .wrap(yargs.terminalWidth())
        .options({
            azureTenantId: {
                type: 'string',
                describe: 'The Azure tenant id.',
                alias: ['azuretenantid', 'azure-tenant-id', 'wcp-azure-tenant-id'],
                coerce: (arg) => {
                    process.env.AZURE_TENANT_ID = arg;

                    return arg;
                },
            },
            azureClientId: {
                type: 'string',
                describe: 'The Azure client id.',
                alias: ['azureclientid', 'azure-client-id', 'wcp-azure-client-id'],
                coerce: (arg) => {
                    process.env.AZURE_CLIENT_ID = arg;

                    return arg;
                },
            },
            azureClientSecret: {
                type: 'string',
                describe: 'The Azure client secret.',
                alias: ['azureclientsecret', 'azure-client-secret', 'wcp-azure-client-secret'],
                coerce: (arg) => {
                    process.env.AZURE_CLIENT_SECRET = arg;

                    return arg;
                },
            },
            dataFolder: {
                type: 'string',
                describe: 'The data folder relative location.',
                default: './data',
                alias: ['datafolder', 'data-folder'],
            },
            metadataFile: {
                type: 'string',
                describe: 'The file with privacy scan metadata data.',
                alias: ['metadatafile', 'metadata-file', 'privacy-metadata-file'],
            },
            azureStorageName: {
                type: 'string',
                describe: 'The privacy storage name.',
                alias: ['azurestoragename', 'wcp-azure-storage-name'],
            },
            azureBlobContainerName: {
                type: 'string',
                describe: 'The privacy blob container name.',
                alias: ['azureblobcontainername', 'wcp-azure-blob-container-name'],
            },
        })
        .describe('help', 'Show help').argv as unknown as ClientArgs;
}

(async () => {
    dotenv.config();
    await main();
})().catch((error) => {
    console.log('Exception occurred while running the tool: ', System.serializeError(error));
    process.exitCode = 1;
});
