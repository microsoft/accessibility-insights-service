// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';
import type { ProtocolMapping } from 'devtools-protocol/types/protocol-mapping.js';
import { PuppeteerTimeoutConfig } from './page-timeout-config';

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
    // Lowering the timeout from the default puppeteer CDP protocol timeout to be able to catch the exception.
    public cdpProtocolTimeout = PuppeteerTimeoutConfig.CdpProtocolTimeout - 5000;

    public async send<T extends keyof ProtocolMapping.Commands>(
        page: Puppeteer.Page,
        method: T,
        params?: ProtocolMapping.Commands[T]['paramsType'][0],
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
                }, this.cdpProtocolTimeout);

                return timer;
            });
            const send = client.send(method, params);
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
