// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import fs from 'fs';
import * as readline from 'readline';
import yargs from 'yargs';
import { GuidGenerator, System, HashGenerator } from 'common';
import * as nodeFetch from 'node-fetch';
import * as dotenv from 'dotenv';
import pLimit from 'p-limit';
import { isEmpty } from 'lodash';
import { ScanRunRequest } from '../web-api/api-contracts/scan-run-request';
import { ScanRunResponse } from '../web-api/api-contracts/scan-run-response';
import { ScanRunResultResponse } from '../web-api/api-contracts/scan-result-response';
import { getOAuthToken, ensureHttpResponse, createGetHttpRequest, createPostHttpRequest, writeToFile } from './common-lib';

/* eslint-disable @typescript-eslint/no-explicit-any, security/detect-non-literal-fs-filename */

type ClientOperation = 'submit-scan' | 'get-result';

interface ClientArgs {
    operation: ClientOperation;
    scanUrl: string;
    scanFile: string;
    oauthClientId: string;
    oauthResourceId: string;
    oauthClientSecret: string;
    serviceBaseUrl: string;
    dataFolder: string;
    hashByUrl: boolean;
}

interface FileData {
    scanUrl: string;
    error?: any;
    data?: any;
}

interface ScanUrlData {
    scanUrl: string;
    knownPages?: string[];
}

const maxConcurrencyLimit = 2;

let clientArgs: ClientArgs;
let token: string;
const guidGenerator = new GuidGenerator();
const hashGenerator = new HashGenerator();
const getDataFolderName = () => `${__dirname}/${clientArgs.dataFolder}`;
const getScanFileName = () => `${getDataFolderName()}/${clientArgs.scanFile}`;
const getPostScanUrl = () => {
    const url = new URL(`${clientArgs.serviceBaseUrl}/scans`);
    url.searchParams.append('api-version', '1.0');

    return url;
};
const getScanStatusUrl = (scanId: string) => {
    const url = new URL(`${clientArgs.serviceBaseUrl}/scans/${scanId}`);
    url.searchParams.append('api-version', '1.0');

    return url;
};
const getReportUrl = (scanId: string, reportId: string) => {
    const url = new URL(`${clientArgs.serviceBaseUrl}/scans/${scanId}/reports/${reportId}`);
    url.searchParams.append('api-version', '1.0');

    return url;
};

async function main(): Promise<void> {
    clientArgs = getClientArguments();
    token = await getOAuthToken(clientArgs.oauthResourceId, clientArgs.oauthClientId, clientArgs.oauthClientSecret);
    await dispatchOperation();
}

async function dispatchOperation(): Promise<void> {
    switch (clientArgs.operation) {
        case 'submit-scan':
            if (!isEmpty(clientArgs.scanUrl)) {
                await sendRequestOperation([{ scanUrl: clientArgs.scanUrl }]);
            } else if (!isEmpty(clientArgs.scanFile)) {
                const scanUrls = await readScanFile();
                await sendRequestOperation(scanUrls);
            } else {
                console.log(`Scan URL input not found. Provide either --scanUrl or --scanFile option.`);
            }
            break;
        case 'get-result':
            await getScanResultOperation();
            break;
        default:
            throw new Error(`Operation ${clientArgs.operation} is not supported.`);
    }
}

async function getScanResultOperation(): Promise<void> {
    const asyncLimit = pLimit(maxConcurrencyLimit);
    const pendingScanIds = readPendingResultsScanIds();
    console.log(`Found ${pendingScanIds.length} pending scans.`);

    await Promise.all(
        await asyncLimit(async () => {
            return pendingScanIds.map(async (scanId) => {
                try {
                    let fileData: FileData;
                    let dataFileName: string;
                    const scanResult = await sendGetScanStatusRequest(scanId);
                    if (scanResult.run?.state === 'completed') {
                        console.log(`Scan ${scanId} has completed`);
                        dataFileName = `${scanId}.completed`;
                        fileData = {
                            scanUrl: scanResult.url,
                            data: scanResult,
                        };
                        await getReportOperation(scanResult);
                    } else if (scanResult.run?.state === 'failed') {
                        console.log(`Scan ${scanId} has failed`);
                        dataFileName = `${scanId}.failed`;
                        fileData = {
                            scanUrl: scanResult.url,
                            error: scanResult.run?.error,
                            data: scanResult,
                        };
                    } else {
                        console.log(`Scan ${scanId} is pending`);
                    }
                    writeToFile(fileData, getDataFolderName(), dataFileName);
                } catch (error) {
                    console.log('Error while processing scan response: ', System.serializeError(error));
                }
            });
        }),
    );
}

async function sendRequestOperation(requests: ScanUrlData[]): Promise<void> {
    const requestsChunks = System.chunkArray(requests, 20);
    requestsChunks.map(async (requestsChunk) => {
        const scanResponses = await sendPrivacyScanRequest(requestsChunk);
        scanResponses.map((scanResponse) => {
            if (scanResponse !== undefined) {
                let fileData: FileData;
                let dataFileName: string;
                if (scanResponse.error) {
                    console.log(`Sending scan request ${scanResponse.scanId} for URL ${scanResponse.url} has failed.`);
                    dataFileName = `${guidGenerator.createGuid()}.error`;
                    fileData = {
                        scanUrl: scanResponse.url,
                        error: scanResponse,
                    };
                } else {
                    console.log(`Scan request ${scanResponse.scanId} for URL ${scanResponse.url} sent successfully.`);
                    dataFileName = `${scanResponse.scanId}.request`;
                    fileData = {
                        scanUrl: scanResponse.url,
                        data: scanResponse,
                    };
                }
                writeToFile(fileData, getDataFolderName(), dataFileName);
            }
        });
    });
}

async function getReportOperation(scanResult: ScanRunResultResponse): Promise<void> {
    const privacyReport = scanResult.reports.find((r) => r.format === 'json');
    if (privacyReport) {
        const report = await sendGetReportRequest(scanResult.scanId, privacyReport.reportId);
        writeToFile(report, getDataFolderName(), `${scanResult.scanId}.privacy`);

        if (clientArgs.hashByUrl === true) {
            const urlHash = hashGenerator.generateBase64Hash(scanResult.url);
            writeToFile(report, getDataFolderName(), `${urlHash}.ai.report`);
        }
        console.log(`Privacy scan report for scan ${scanResult.scanId} downloaded.`);
    }
}

async function sendGetReportRequest(scanId: string, reportId: string): Promise<any> {
    const httpRequest = createGetHttpRequest(token);
    const httpResponse = await nodeFetch.default(getReportUrl(scanId, reportId), httpRequest);
    await ensureHttpResponse(httpResponse);
    const body = await httpResponse.json();

    return body;
}

async function sendGetScanStatusRequest(scanId: string): Promise<ScanRunResultResponse> {
    const httpRequest = createGetHttpRequest(token);
    const httpResponse = await nodeFetch.default(getScanStatusUrl(scanId), httpRequest);
    await ensureHttpResponse(httpResponse);
    const body = await httpResponse.json();

    return body;
}

async function sendPrivacyScanRequest(requests: ScanUrlData[]): Promise<ScanRunResponse[]> {
    const asyncLimit = pLimit(maxConcurrencyLimit);

    return Promise.all(
        await asyncLimit(async () => {
            try {
                const scanRequests = requests.map((request) => createPrivacyScanRequest(request.scanUrl, request.knownPages));
                const httpRequest = createPostHttpRequest(scanRequests, token);
                const httpResponse = await nodeFetch.default(getPostScanUrl(), httpRequest);
                await ensureHttpResponse(httpResponse);
                const body = await httpResponse.json();

                return body;
            } catch (error) {
                console.log('Error while send scan request: ', System.serializeError(error));

                return undefined;
            }
        }),
    );
}

function createPrivacyScanRequest(scanUrl: string, knownPages?: string[]): ScanRunRequest {
    return {
        url: scanUrl,
        priority: 1,
        site: {
            baseUrl: scanUrl,
            knownPages,
        },
        reportGroups: [
            {
                consolidatedId: guidGenerator.createGuid(),
            },
        ],
        privacyScan: {
            cookieBannerType: 'standard',
        },
    };
}

function getClientArguments(): ClientArgs {
    return yargs
        .env()
        .wrap(yargs.terminalWidth())
        .options({
            operation: {
                type: 'string',
                describe: 'The client operation.',
            },
            scanUrl: {
                type: 'string',
                describe: 'The URL to scan.',
                default: undefined,
                alias: ['scanurl', 'scan-url'],
            },
            scanFile: {
                type: 'string',
                describe: 'The file with URL(s) to scan.',
                default: undefined,
                alias: ['scanfile', 'scan-file'],
            },
            oauthClientId: {
                type: 'string',
                describe: 'The OAuth2 client id.',
                alias: ['oauthclientid', 'ai-oauth-client-id'],
            },
            oauthResourceId: {
                type: 'string',
                describe: 'The OAuth2 resource id.',
                alias: ['oauthresourceid', 'ai-oauth-resource-id'],
            },
            oauthClientSecret: {
                type: 'string',
                describe: 'The OAuth2 client secret.',
                alias: ['oauthclientsecret', 'ai-oauth-client-secret'],
            },
            serviceBaseUrl: {
                type: 'string',
                describe: 'The accessibility service base URL.',
                alias: ['servicebaseurl', 'ai-service-base-url'],
            },
            dataFolder: {
                type: 'string',
                describe: 'The data folder relative location.',
                default: './data',
                alias: ['datafolder', 'data-folder'],
            },
            hashByUrl: {
                type: 'boolean',
                describe: 'When this option is enabled the report saved into file with URL`s hash name.',
                default: false,
                alias: ['hashbyurl'],
            },
        })
        .describe('help', 'Show help').argv as unknown as ClientArgs;
}

async function readScanFile(): Promise<ScanUrlData[]> {
    if (!fs.existsSync(getScanFileName())) {
        console.log(`File not found ${getScanFileName()}`);

        return [];
    }

    const scanUrls: ScanUrlData[] = [];
    const fileStream = fs.createReadStream(getScanFileName(), { encoding: 'ascii' });
    const fileReader = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });

    for await (const line of fileReader) {
        scanUrls.push({
            scanUrl: line,
        });
    }

    return scanUrls;
}

function readPendingResultsScanIds(): string[] {
    if (!fs.existsSync(getDataFolderName())) {
        console.log(`Folder not found ${getDataFolderName()}`);

        return [];
    }

    const dataFiles = fs.readdirSync(getDataFolderName());
    const submitted = dataFiles.filter((f) => f.endsWith('.request.json')).map((s) => s.substring(0, 36));
    const completed = dataFiles.filter((f) => f.endsWith('.failed.json') || f.endsWith('.completed.json')).map((s) => s.substring(0, 36));
    const pendingRequests = submitted.filter((f) => !completed.includes(f));

    return pendingRequests;
}

(async () => {
    dotenv.config();
    await main();
})().catch((error) => {
    console.log('Exception occurred while running the tool: ', System.serializeError(error));
    process.exitCode = 1;
});
