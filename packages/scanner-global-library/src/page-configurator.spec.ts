// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Page, ConnectionTransport } from 'puppeteer';
import { IMock, Mock } from 'typemoq';
import { PageConfigurator } from './page-configurator';

describe(PageConfigurator, () => {
    let pageConfigurator: PageConfigurator;
    let pageMock: IMock<Page>;
    let connectionTransportMock: IMock<ConnectionTransport>;

    const viewport = {
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
    };

    beforeEach(() => {
        pageMock = Mock.ofType<Page>();
        connectionTransportMock = Mock.ofType<ConnectionTransport>();

        pageMock
            .setup(async (o) => o.setViewport(viewport))
            .returns(() => Promise.resolve())
            .verifiable();
        connectionTransportMock
            .setup((o) => o.send('Emulation.clearDeviceMetricsOverride'))
            .returns(() => Promise.resolve())
            .verifiable();
        pageMock
            //@ts-expect-error
            .setup((o) => o._client)
            .returns(() => connectionTransportMock.object)
            .verifiable();
        pageMock
            .setup(async (o) => o.setBypassCSP(true))
            .returns(() => Promise.resolve())
            .verifiable();

        pageConfigurator = new PageConfigurator();
    });

    afterEach(() => {
        pageMock.verifyAll();
        connectionTransportMock.verifyAll();
    });

    it('configurePage()', async () => {
        await pageConfigurator.configurePage(pageMock.object);
        expect(pageConfigurator.getBrowserResolution()).toEqual('1920x1080');
    });
});
