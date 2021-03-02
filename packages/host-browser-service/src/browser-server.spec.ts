// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import http from 'http';
import net from 'net';
import { It, Mock, Times } from 'typemoq';
import Puppeteer from 'puppeteer';
import { GlobalLogger } from 'logger';
import Server from 'http-proxy';
import { BrowserLauncher } from './browser-launcher';
import { BrowserServer } from './browser-server';

describe(BrowserServer, () => {
    const launcherMock = Mock.ofType<BrowserLauncher>();
    const loggerMock = Mock.ofType<GlobalLogger>();
    const serverMock = Mock.ofType<http.Server>();
    const wsProxyMock = Mock.ofInstance(new Server().ws);
    const socketMock = Mock.ofType<net.Socket>();

    let closeListener: () => void;
    let listenListener: () => void;
    let upgradeListener: (...args: unknown[]) => Promise<void>;
    let socketErrorListener: (e: unknown) => void;

    const httpStub = {
        createServer: (rl: http.RequestListener) => serverMock.object,
    } as typeof http;

    const httpProxyStub = ({
        createProxyServer: (options?: Server.ServerOptions) => {
            return {
                ws: wsProxyMock.object,
            };
        },
    } as unknown) as typeof Server;

    beforeEach(() => {
        serverMock
            .setup((m) => m.on('upgrade', It.isAny()))
            .returns((_, func) => (upgradeListener = func))
            .verifiable(Times.once());
        serverMock
            .setup((m) => m.on('close', It.isAny()))
            .returns((_, func) => (closeListener = func))
            .verifiable(Times.once());
        serverMock
            .setup((m) => m.listen(8585, It.isAny()))
            .returns((_, func) => (listenListener = func))
            .verifiable(Times.once());

        socketMock.setup((m) => m.on('error', It.isAny())).callback((_, func) => (socketErrorListener = func));

        const browserServer = new BrowserServer(launcherMock.object, loggerMock.object, httpStub, httpProxyStub);
        browserServer.run();
    });

    afterEach(() => {
        serverMock.verifyAll();
        launcherMock.reset();
        serverMock.reset();
    });

    it('on close, closes all browsers', () => {
        closeListener();
        launcherMock.verify((m) => m.closeAll(), Times.once());
    });

    it('server listens to 8585 and logs', () => {
        listenListener();
        loggerMock.verify((m) => m.logInfo(It.isAnyString()), Times.once());
    });

    it('proxies to ws target when upgrade event emitted', async () => {
        const req = {} as http.IncomingMessage;

        const head = {};
        const target = 'ws';
        const browserStub = {
            wsEndpoint: () => target,
        } as Puppeteer.Browser;
        launcherMock.setup((l) => l.launch(It.isAny())).returns(() => Promise.resolve(browserStub));

        await upgradeListener(req, socketMock.object, head);
        wsProxyMock.verify((m) => m(req, socketMock.object, head, { target }), Times.once());
    });

    it('logs error when we fail to launch browser', async () => {
        launcherMock.setup((l) => l.launch(It.isAny())).returns(() => Promise.reject());

        await upgradeListener({}, socketMock.object, {});
        socketMock.verify((m) => m.end(), Times.once());
        loggerMock.verify((l) => l.logInfo(It.isAnyString()), Times.exactly(2));
    });

    it('logs errors from incoming sockets', async () => {
        await upgradeListener({}, socketMock.object, {});

        socketErrorListener({ message: 'test' });
        loggerMock.verify((l) => l.logInfo(`incoming socket error: test`), Times.once());
    });
});
