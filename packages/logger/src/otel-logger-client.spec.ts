// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { Resource } from '@opentelemetry/resources';
import { OTelLoggerClient } from './otel-logger-client';
import { OTelConfig, OTelConfigProvider } from './otel-config-provider';

/* eslint-disable @typescript-eslint/no-explicit-any */

let otelConfigProviderMock: IMock<OTelConfigProvider>;
let resourceMock: IMock<Resource>;
let otelLoggerClient: OTelLoggerClient;

describe(OTelLoggerClient, () => {
    beforeEach(() => {
        otelConfigProviderMock = Mock.ofType<OTelConfigProvider>();
        resourceMock = Mock.ofType<Resource>();

        otelLoggerClient = new OTelLoggerClient(otelConfigProviderMock.object, resourceMock.object);
    });

    afterEach(() => {
        // otelConfigProviderMock.verifyAll();
    });

    it('skip OTel setup when not supported', async () => {
        const config = { otelSupported: false } as OTelConfig;
        otelConfigProviderMock
            .setup((o) => o.getConfig())
            .returns(() => Promise.resolve(config))
            .verifiable();
        resourceMock.setup((o) => o.merge).verifiable(Times.never());

        await otelLoggerClient.setup();
        expect((otelLoggerClient as any).enabled).toEqual(false);
    });
});
