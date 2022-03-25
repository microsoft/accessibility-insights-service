// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import fs from 'fs';
import * as readline from 'readline';
import yargs from 'yargs';
import { GuidGenerator, System } from 'common';
import * as nodeFetch from 'node-fetch';
import * as dotenv from 'dotenv';
import pLimit from 'p-limit';
import { isEmpty } from 'lodash';
import { ScanRunRequest } from '../web-api/api-contracts/scan-run-request';
import { ScanRunResponse } from '../web-api/api-contracts/scan-run-response';
import { ScanRunResultResponse } from '../web-api/api-contracts/scan-result-response';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable security/detect-non-literal-fs-filename */

type ClientOperation = 'submitScan' | 'getResult';

interface ClientArgs {
    operation: ClientOperation;
    scanUrl: string;
    scanFile: string;
    oauthClientId: string;
    oauthResourceId: string;
    oauthClientSecret: string;
    serviceBaseUrl: string;
    dataFolder: string;
}

interface OAuthToken {
    access_token: string;
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

const maxConcurrencyLimit = 10;
let clientArgs: ClientArgs;
let token: string;
const guidGenerator = new GuidGenerator();
const getDataFolderName = () => `${__dirname}/${clientArgs.dataFolder}`;
const getScanFileName = () => `${__dirname}/${clientArgs.scanFile}`;
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
    token = await getOAuthToken();
    await dispatchOperation();
}

async function dispatchOperation(): Promise<void> {
    switch (clientArgs.operation) {
        case 'submitScan':
            if (!isEmpty(clientArgs.scanUrl)) {
                await sendRequestOperation([{ scanUrl: clientArgs.scanUrl }]);
            } else if (!isEmpty(clientArgs.scanFile)) {
                const scanUrls = await readScanFile();
                await sendRequestOperation(scanUrls);
            } else {
                console.log(`Scan URL input not found. Provide either --scanUrl or --scanFile option.`);
            }
            break;
        case 'getResult':
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
                writeDataFile(fileData, dataFileName);
            });
        }),
    );
}

async function sendRequestOperation(requests: ScanUrlData[]): Promise<void> {
    const requestsChunks = System.chunkArray(requests, 20);
    requestsChunks.map(async (requestsChunk) => {
        const scanResponses = await sendPrivacyScanRequest(requestsChunk);
        scanResponses.map((scanResponse) => {
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
            writeDataFile(fileData, dataFileName);
        });
    });
}

async function getReportOperation(scanResult: ScanRunResultResponse): Promise<void> {
    const privacyReport = scanResult.reports.find((r) => r.format === 'consolidated.json');
    if (privacyReport) {
        const report = await sendGetReportRequest(scanResult.scanId, privacyReport.reportId);
        writeDataFile(report, `${scanResult.scanId}.privacy`);
        console.log(`Privacy scan report for scan ${scanResult.scanId} downloaded.`);
    }
}

async function sendGetReportRequest(scanId: string, reportId: string): Promise<any> {
    const httpRequest = createGetHttpRequest();
    const httpResponse = await nodeFetch.default(getReportUrl(scanId, reportId), httpRequest);
    await ensureHttpResponse(httpResponse);
    const body = await httpResponse.json();

    return body;
}

async function sendGetScanStatusRequest(scanId: string): Promise<ScanRunResultResponse> {
    const httpRequest = createGetHttpRequest();
    const httpResponse = await nodeFetch.default(getScanStatusUrl(scanId), httpRequest);
    await ensureHttpResponse(httpResponse);
    const body = await httpResponse.json();

    return body;
}

async function sendPrivacyScanRequest(requests: ScanUrlData[]): Promise<ScanRunResponse[]> {
    const asyncLimit = pLimit(maxConcurrencyLimit);

    return Promise.all(
        await asyncLimit(async () => {
            const scanRequests = requests.map((request) => createPrivacyScanRequest(request.scanUrl, request.knownPages));
            const httpRequest = createPostHttpRequest(scanRequests);
            const httpResponse = await nodeFetch.default(getPostScanUrl(), httpRequest);
            await ensureHttpResponse(httpResponse);
            const body = await httpResponse.json();

            return body;
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

async function getOAuthToken(): Promise<string> {
    const url = `https://login.microsoftonline.com/microsoft.onmicrosoft.com/oauth2/token`;
    const httpRequest = createGetTokenHttpRequest();
    const httpResponse = await nodeFetch.default(url, httpRequest);
    await ensureHttpResponse(httpResponse);
    const body = await httpResponse.json();

    return (body as OAuthToken).access_token;
}

function createGetTokenHttpRequest(): nodeFetch.RequestInit {
    const headers: nodeFetch.HeadersInit = {
        'Content-Type': 'application/x-www-form-urlencoded',
    };

    const body = `grant_type=client_credentials&client_id=${clientArgs.oauthClientId}&resource=${
        clientArgs.oauthResourceId
    }&client_secret=${encodeURI(clientArgs.oauthClientSecret)}`;

    return {
        method: 'POST',
        headers,
        body,
    };
}

function createGetHttpRequest(): nodeFetch.RequestInit {
    const headers: nodeFetch.HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    };

    return {
        method: 'GET',
        headers,
    };
}

function createPostHttpRequest(scanRequests: ScanRunRequest[]): nodeFetch.RequestInit {
    const headers: nodeFetch.HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    };
    const body = JSON.stringify(scanRequests);

    return {
        method: 'POST',
        headers,
        body,
    };
}

function getClientArguments(): ClientArgs {
    return yargs
        .env()
        .wrap(yargs.terminalWidth())
        .options({
            operation: {
                type: 'string',
                describe: 'The client operation: sendRequest | getScanResult.',
            },
            scanUrl: {
                type: 'string',
                describe: 'The URL to scan.',
                default: undefined,
                alias: 'scanurl',
            },
            scanFile: {
                type: 'string',
                describe: 'The file with URL(s) to scan.',
                default: undefined,
                alias: 'scanfile',
            },
            oauthClientId: {
                type: 'string',
                describe: 'The OAuth2 client id.',
                alias: 'oauthclientid',
            },
            oauthResourceId: {
                type: 'string',
                describe: 'The OAuth2 resource id.',
                alias: 'oauthresourceid',
            },
            oauthClientSecret: {
                type: 'string',
                describe: 'The OAuth2 client secret.',
                alias: 'oauthclientsecret',
            },
            serviceBaseUrl: {
                type: 'string',
                describe: 'The accessibility service base URL.',
                alias: 'servicebaseurl',
            },
            dataFolder: {
                type: 'string',
                describe: 'The data folder relative location.',
                default: './data',
                alias: 'datafolder',
            },
        })
        .describe('help', 'Show help').argv as unknown as ClientArgs;
}

async function readScanFile(): Promise<ScanUrlData[]> {
    if (!fs.existsSync(getScanFileName())) {
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
    const dataFiles = fs.readdirSync(getDataFolderName());
    const submitted = dataFiles.filter((f) => f.endsWith('.request.json')).map((s) => s.substring(0, 36));
    const completed = dataFiles.filter((f) => f.endsWith('.failed.json') || f.endsWith('.completed.json')).map((s) => s.substring(0, 36));
    const pendingRequests = submitted.filter((f) => !completed.includes(f));

    return pendingRequests;
}

function writeDataFile(data: any, fileName: string): void {
    if (!fs.existsSync(getDataFolderName())) {
        fs.mkdirSync(getDataFolderName());
    }

    const filePath = `${getDataFolderName()}/${fileName}.json`;
    const content = JSON.stringify(data, undefined, '    ');
    fs.writeFileSync(filePath, content);
}

async function ensureHttpResponse(response: nodeFetch.Response): Promise<void> {
    if (response.status < 200 || response.status > 299) {
        const body = await response.text();

        throw new Error(body);
    }
}

(async () => {
    dotenv.config();
    await main();
})().catch((error) => {
    console.log('Exception occurred while running the tool: ', System.serializeError(error));
    process.exitCode = 1;
});
