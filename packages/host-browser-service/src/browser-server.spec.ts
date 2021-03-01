// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Mock, Times } from 'typemoq';
import { GlobalLogger } from 'logger';
import { BrowserServer } from './browser-server';

describe(BrowserServer, () => {
    it('server logs', () => {
        const loggerMock = Mock.ofType<GlobalLogger>();
        const browserServer = new BrowserServer(loggerMock.object);
        browserServer.run();
        loggerMock.verify((m) => m.logInfo(`BrowserServer.run() called`), Times.once());
    });
});
