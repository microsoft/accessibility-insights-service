import * as yargs from 'yargs';
import * as nodeFetch from 'node-fetch';

type LoadTestArgs = {
    scanNotifyUrl: string;
    adAuthToken: string;
    requestUrl: string;
    maxLoad: number;
};

yargs.option('maxLoad', {
    alias: 'l',
    default: 10,
});

yargs.option('requestUrl', {
    alias: 'r',
});

yargs.option('scanNotifyUrl', {
    alias: 'n',
});

yargs.option('adAuthToken', {
    alias: 't',
    default: process.env.adAuthToken,
    description: 'AD Auth token. Can be created using Postman. Either pass via command line or set env variable - adAuthToken',
});

yargs.demandOption(['requestUrl', 'adAuthToken']);
const inputArgs = yargs.argv as yargs.Arguments<LoadTestArgs>;

console.log('Input args passed', inputArgs);

function getRequestOptions(): nodeFetch.RequestInit {
    const myHeaders: { [key: string]: any } = {
        'Content-Type': ['application/json'],
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

    const submitRequest = async () => {
        try {
            const response = await nodeFetch.default(inputArgs.requestUrl, requestOptions);
            successfulRequests += 1;
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
    console.log(`Successful Requests ${successfulRequests}`);
    console.log(`Failed Requests ${errorRequests}`);
}

runLoadTest().catch((error) => {
    console.log('Error occurred', error);
});
