// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as nodeFetch from 'node-fetch';
import * as yargs from 'yargs';

setupInputArgsExpectation();
const inputArgs = yargs.argv as yargs.Arguments<LoadTestArgs>;
console.log('Input args passed', inputArgs);

type LoadTestArgs = {
    scanNotifyUrl: string;
    adAuthToken: string;
    requestUrl: string;
    maxLoad: number;
};

function setupInputArgsExpectation(): void {
    yargs.option<keyof LoadTestArgs, yargs.Options>('maxLoad', {
        alias: 'l',
        default: 10,
        type: 'number',
    });

    yargs.option<keyof LoadTestArgs, yargs.Options>('requestUrl', {
        alias: 'r',
        demandOption: true,
    });

    yargs.option<keyof LoadTestArgs, yargs.Options>('scanNotifyUrl', {
        alias: 'n',
        demandOption: true,
    });

    yargs.option<keyof LoadTestArgs, yargs.Options>('adAuthToken', {
        alias: 't',
        default: process.env.adAuthToken,
        demandOption: true,
        description: 'AD Auth token. Can be created using Postman. Either pass via command line or set env variable - adAuthToken',
    });
}

function getRequestOptions(): nodeFetch.RequestInit {
    const myHeaders: nodeFetch.HeaderInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${inputArgs.adAuthToken}`,
    };

    const raw = JSON.stringify([
        {
            url: 'https://www.bing.com',
            priority: 1,
            scanNotifyUrl: process.env.scanNotifyUrl,
        },
    ]);

    return {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow',
    };
}

async function runLoadTest(): Promise<void> {
    const promises: Promise<void>[] = [];
    let successfulRequests = 0;
    let errorRequests = 0;
    const requestOptions = getRequestOptions();
    const responseCountByStatusCode: { [key: number]: number } = {};

    const submitRequest = async () => {
        try {
            const response = await nodeFetch.default(inputArgs.requestUrl, requestOptions);
            successfulRequests += 1;
            responseCountByStatusCode[response.status] = (responseCountByStatusCode[response.status] ?? 0) + 1;

            console.log(`received response with status ${response.status}`);
            console.log(`Response body ${await response.text()}`);
        } catch (error) {
            errorRequests += 1;
            console.log('error response', error);
        }
    };

    for (let i = 0; i < inputArgs.maxLoad; i += 1) {
        promises.push(submitRequest());
    }

    console.log(`Submitted Requests - ${inputArgs.maxLoad}. Waiting for requests to complete.....`);
    await Promise.all(promises);

    console.log(`Total Requests Submitted: ${inputArgs.maxLoad}`);
    console.log(`Completed Requests ${successfulRequests}`);
    console.log('Completed Request count by status code', responseCountByStatusCode);
    console.log(`Failed Requests ${errorRequests}`);
}

runLoadTest().catch((error) => {
    console.log('Error occurred', error);
});
