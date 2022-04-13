// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import fs from 'fs';
import yargs from 'yargs';
import { System } from 'common';
import * as dotenv from 'dotenv';
// import { getOAuthToken } from './common-lib';

/* eslint-disable @typescript-eslint/no-explicit-any, security/detect-non-literal-fs-filename */

interface PrivacyMetadata {
    ID: string;
    Name: string;
    StartedDate: string;
    ValidationResultBlobName: string;
}

interface ClientArgs {
    oauthClientId: string;
    oauthResourceId: string;
    oauthClientSecret: string;
    dataFolder: string;
    metadataFile: string;
}

let clientArgs: ClientArgs;
// let token: string;
const getMetadataFileName = () => `${__dirname}/${clientArgs.metadataFile}`;

async function main(): Promise<void> {
    clientArgs = getClientArguments();
    // token = await getOAuthToken(clientArgs);
    await exportScanResult();
}

async function exportScanResult(): Promise<void> {
    const privacyMetadata = readMetadataFile();

    console.log(privacyMetadata);

    return;
}

function readMetadataFile(): PrivacyMetadata[] {
    if (!fs.existsSync(getMetadataFileName())) {
        console.log(`File not found ${getMetadataFileName()}`);

        return [];
    }

    return JSON.parse(fs.readFileSync(getMetadataFileName(), { encoding: 'utf-8' })) as PrivacyMetadata[];
}

// async function downloadScanBlob

function getClientArguments(): ClientArgs {
    return yargs
        .env()
        .wrap(yargs.terminalWidth())
        .options({
            oauthClientId: {
                type: 'string',
                describe: 'The OAuth2 client id.',
                alias: ['oauthclientid', 'wcp-oauthclientid'],
            },
            oauthResourceId: {
                type: 'string',
                describe: 'The OAuth2 resource id.',
                alias: ['oauthresourceid', 'wcp-oauthresourceid'],
            },
            oauthClientSecret: {
                type: 'string',
                describe: 'The OAuth2 client secret.',
                alias: ['oauthclientsecret', 'wcp-oauthclientsecret'],
            },
            dataFolder: {
                type: 'string',
                describe: 'The data folder relative location.',
                default: './data',
                alias: 'datafolder',
            },
            metadataFile: {
                type: 'string',
                describe: 'The file with privacy scan metadata data.',
                default: 'privacy-data.json',
                alias: 'metadatafile',
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
