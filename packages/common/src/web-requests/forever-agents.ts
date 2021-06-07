// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as http from 'http';
import * as https from 'https';
import { Agents } from 'got';

export function getForeverAgents(HttpAgent: typeof http.Agent = http.Agent, HttpsAgent: typeof https.Agent = https.Agent): Agents {
    return {
        http: new HttpAgent({ keepAlive: true }),
        https: new HttpsAgent({ keepAlive: true }),
    };
}
