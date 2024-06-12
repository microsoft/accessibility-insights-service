// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';
import type { ProtocolMapping } from 'devtools-protocol/types/protocol-mapping.js';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The Chrome DevTools Protocol (CDP) session wrapper.
 *
 * The CDP session may timeout when browser is not responding. The puppeteer API will
 * reject promise from setTimeout() callback on connection timeout. The promise reject will
 * throw uncaught exception from within calling context. The workaround to handle
 * connection timeout uncaught exception is to resolve connection promise before puppeteer
 * API rejects it. See puppeteer/packages/puppeteer-core/src/common/Connection.ts for details.
 */
@injectable()
export class DevToolsSession {
    // Default puppeteer CDP protocol timeout is 180 secs. Increasing protocolTimeout beyond
    // default value will require to increase the 'protocolTimeout' setting in browser
    // launch/connect calls.
    public protocolTimeout = 90000;

    public async send<T extends keyof ProtocolMapping.Commands>(
        page: Puppeteer.Page,
        method: T,
        ...paramArgs: ProtocolMapping.Commands[T]['paramsType']
    ): Promise<ProtocolMapping.Commands[T]['returnType']> {
        let timer;
        let client;

        try {
            let timedOut;

            client = await page.createCDPSession();
            const wait = new Promise<void>((resolve) => {
                timer = setTimeout(() => {
                    timedOut = true;
                    resolve();
                }, this.protocolTimeout);

                return timer;
            });
            const send = client.send(method, ...paramArgs);
            const result = await Promise.race([send, wait]);

            if (timedOut === true) {
                // Resolve connection promise before puppeteer API rejects it
                (client as any)._onMessage({ id: 1 } /** CDPSessionOnMessageObject */);

                throw new Error('The CDP session timed out.');
            }

            return result;
        } finally {
            clearTimeout(timer);
            await client?.detach().catch();
        }
    }
}
