// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import http from 'http';
import net from 'net';
import Server from 'http-proxy';
import { inject, injectable, optional } from 'inversify';
import { GlobalLogger, Logger } from 'logger';
import { BrowserLauncher } from './browser-launcher';

@injectable()
export class BrowserServer {
    constructor(
        @inject(BrowserLauncher) private readonly browserLauncher: BrowserLauncher,
        @inject(GlobalLogger) @optional() private readonly logger: Logger,
        private readonly Http: typeof http = http,
        private readonly ProxyServer: typeof Server = Server,
    ) {}

    public run(): void {
        const proxy = this.ProxyServer.createProxyServer();
        const server = this.Http.createServer();
        server.on('upgrade', async (req, socket: net.Socket, head) => {
            try {
                socket.on('error', (e) => {
                    this.logger.logInfo(`incoming socket error: ${e?.message}`);
                });

                const browser = await this.browserLauncher.launch();
                const target = browser.wsEndpoint();
                proxy.ws(req, socket, head, { target });
            } catch (e) {
                this.logger.logInfo(`Could not proxy websocket request upon upgrade event: ${e?.message}`);
                socket.end();
            }
        });

        server.on('close', async () => {
            await this.browserLauncher.closeAll();
        });

        server.listen(8585, () => {
            this.logger.logInfo(`server started, puppeteer.connect with wsEndpoint http://localhost:8585`);
        });
    }
}
