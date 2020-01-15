// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';
import { TestRunResult } from 'service-library';
import { A11yServiceClient, A11yServiceCredential } from 'web-api-client';
import * as yargs from 'yargs';

// tslint:disable: radix no-any
type Argv = {
    clientId: string;
    clientSecret: string;
    authorityUrl: string;
    waitTimeBeforeEvaluationInMinutes: string;
    evaluationIntervalInMinutes: string;
    releaseId: string;
    baseUrl: string;
};

const argv: Argv = yargs.argv as any;

console.log('[E2E] - start evaluate functional test results');

const cred = new A11yServiceCredential(argv.clientId, argv.clientSecret, argv.clientId, argv.authorityUrl);
const client = new A11yServiceClient(cred, argv.baseUrl);

const waitTimeBeforeEvaluation = parseInt(argv.waitTimeBeforeEvaluationInMinutes) * 60 * 1000;
const evaluationInterval = parseInt(argv.evaluationIntervalInMinutes) * 60 * 1000;

let healthStatus: TestRunResult;

setTimeout(async () => {
    while (healthStatus !== 'pass') {
        try {
            console.log('[E2E] fetching health report');
            const response = await client.checkHealth(`/release/${argv.releaseId}`);
            if (response.statusCode !== 200) {
                throw new Error(JSON.stringify(response));
            }
            console.log('[E2E] health report fetched:', JSON.stringify(response.body));
            healthStatus = response.body.healthStatus;
        } catch (error) {
            console.log('[E2E] failed to evaluate functional test results: ', error);
        }

        if (healthStatus !== 'pass') {
            console.log('[E2E] e2e tests are failing. Waiting for next evaluation');

            // tslint:disable-next-line: no-empty
            setTimeout(() => {}, evaluationInterval);
        } else {
            console.log('[E2E] functional tests passed.');
        }
    }
}, waitTimeBeforeEvaluation);
