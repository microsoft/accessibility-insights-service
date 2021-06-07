// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as nodeFetch from 'node-fetch';
import * as yargs from 'yargs';
import { GuidGenerator, System } from 'common';
import { ScanRunRequest } from '../web-api/api-contracts/scan-run-request';

type RequestType = 'scan' | 'consolidated-report' | 'deep-scan';

type LoadTestArgs = {
    scanNotifyUrl: string;
    adAuthToken: string;
    requestUrl: string;
    maxLoad: number;
    consolidatedId: string;
    requestType: RequestType;
};

function getScanArguments(): LoadTestArgs {
    yargs.option<keyof LoadTestArgs, yargs.Options>('maxLoad', {
        alias: 'l',
        default: 10,
        type: 'number',
        description: 'Maximum number request to send',
    });

    yargs.option<keyof LoadTestArgs, yargs.Options>('requestUrl', {
        alias: 'u',
        demandOption: true,
        description: 'The service endpoint URL to send request',
    });

    yargs.option<keyof LoadTestArgs, yargs.Options>('scanNotifyUrl', {
        alias: 'n',
        default: 'http://localhost/',
        description: 'Scan completion notification URL',
    });

    yargs.option<keyof LoadTestArgs, yargs.Options>('consolidatedId', {
        alias: 'c',
        default: new GuidGenerator().createGuid(),
        description: 'Consolidated report id',
    });

    yargs.option<keyof LoadTestArgs, yargs.Options>('requestType', {
        alias: 'r',
        default: 'scan',
        description: `The request type to send. Supported types: 'scan', 'consolidated-report', 'deep-scan'`,
    });

    yargs.option<keyof LoadTestArgs, yargs.Options>('adAuthToken', {
        alias: 't',
        default: process.env.adAuthToken,
        demandOption: true,
        description: 'Azure Active Directory auth token. Can be created using Postman. Option can also be set via adAuthToken env variable',
    });

    yargs.wrap(yargs.terminalWidth()).describe('help', 'Show help');

    return yargs.argv as yargs.Arguments<LoadTestArgs>;
}

function getRequestOptions(requestId: number, scanArguments: LoadTestArgs): nodeFetch.RequestInit {
    const myHeaders: nodeFetch.HeaderInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${scanArguments.adAuthToken}`,
    };

    const request: ScanRunRequest = {
        url: `https://www.bing.com/search?q=a ${requestId}`,
        priority: 1,
        scanNotifyUrl: scanArguments.scanNotifyUrl,
    };

    if (scanArguments.requestType === 'consolidated-report' || scanArguments.requestType === 'deep-scan') {
        request.site = {
            baseUrl: 'https://www.bing.com/',
        };
        request.reportGroups = [
            {
                consolidatedId: scanArguments.consolidatedId,
            },
        ];
    }

    if (scanArguments.requestType === 'deep-scan') {
        request.deepScan = true;
    }

    return {
        method: 'POST',
        headers: myHeaders,
        body: JSON.stringify([request]),
        redirect: 'follow',
    };
}

async function runLoadTest(scanArguments: LoadTestArgs): Promise<void> {
    const promises: Promise<void>[] = [];
    const responseCountByStatusCode: { [key: number]: number } = {};
    let successfulRequests = 0;
    let errorRequests = 0;

    const submitRequest = async (requestId: number) => {
        try {
            const requestOptions = getRequestOptions(requestId, scanArguments);
            const response = await nodeFetch.default(scanArguments.requestUrl, requestOptions);
            successfulRequests += 1;
            responseCountByStatusCode[response.status] = (responseCountByStatusCode[response.status] ?? 0) + 1;

            console.log(`received response with status ${response.status}`);
            console.log(`Response body ${await response.text()}`);
        } catch (error) {
            errorRequests += 1;
            console.log('error response', error);
        }
    };

    for (let i = 0; i < scanArguments.maxLoad; i += 1) {
        promises.push(submitRequest(i + 1));
    }

    console.log(`Submitted Requests - ${scanArguments.maxLoad}. Waiting for requests to complete...`);
    await Promise.all(promises);

    console.log(`Total Requests Submitted: ${scanArguments.maxLoad}`);
    console.log(`Completed Requests ${successfulRequests}`);
    console.log('Completed Request count by status code', responseCountByStatusCode);
    console.log(`Failed Requests ${errorRequests}`);
}

(async () => {
    const scanArguments = getScanArguments();
    await runLoadTest(scanArguments);
})().catch((error) => {
    console.log('Exception occurred while running the utility: ', System.serializeError(error));
    process.exitCode = 1;
});
