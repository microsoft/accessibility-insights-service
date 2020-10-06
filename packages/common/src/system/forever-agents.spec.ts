// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';
import * as http from 'http';
import * as https from 'https';
import { getForeverAgents } from './forever-agents';

class TestableHttpAgent extends http.Agent {
    constructor(public readonly opts?: http.AgentOptions) {
        super(opts);
    }
}

class TestableHttpsAgent extends https.Agent {
    constructor(public readonly opts?: https.AgentOptions) {
        super(opts);
    }
}

describe(getForeverAgents, () => {
    it('returns http and https agents', () => {
        const agents = getForeverAgents(TestableHttpAgent, TestableHttpsAgent);

        expect(agents.http).toBeDefined();
        expect(agents.http).toBeInstanceOf(TestableHttpAgent);
        expect(agents.https).toBeDefined();
        expect(agents.https).toBeInstanceOf(TestableHttpsAgent);
    });

    it('returns agents with expected options', () => {
        const expectedOptions = { keepAlive: true };
        const agents = getForeverAgents(TestableHttpAgent, TestableHttpsAgent);

        const httpAgent: TestableHttpAgent = agents.http;
        const httpsAgent: TestableHttpsAgent = agents.https;

        expect(httpAgent.opts).toEqual(expectedOptions);
        expect(httpsAgent.opts).toEqual(expectedOptions);
    });
});
