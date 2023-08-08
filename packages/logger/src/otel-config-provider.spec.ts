// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import net, { Socket } from 'net';
import { IMock, Mock } from 'typemoq';
import { IpGeolocation, IpGeolocationProvider, MetricsConfig, ServiceConfiguration, System } from 'common';
import { InvocationResult, PowerShell } from 'node-powershell';
import { OTelConfigProvider } from './otel-config-provider';

/* eslint-disable @typescript-eslint/no-explicit-any */

let ipGeolocationProviderMock: IMock<IpGeolocationProvider>;
let serviceConfigurationMock: IMock<ServiceConfiguration>;
let originalPlatform: any;
let originalCreateConnectionFn: any;
let socketStub: Socket;
let otelConfigProvider: OTelConfigProvider;

describe(OTelConfigProvider, () => {
    beforeEach(() => {
        ipGeolocationProviderMock = Mock.ofType<IpGeolocationProvider>();
        serviceConfigurationMock = Mock.ofType<ServiceConfiguration>();
        originalPlatform = process.platform;
        Object.defineProperty(process, 'platform', {
            value: 'win32',
        });

        originalCreateConnectionFn = net.createConnection;
        socketStub = {} as Socket;
        socketStub.on = () => socketStub;
        socketStub.destroy = () => socketStub;

        otelConfigProvider = new OTelConfigProvider(ipGeolocationProviderMock.object, serviceConfigurationMock.object);
    });

    afterEach(() => {
        ipGeolocationProviderMock.verifyAll();
        serviceConfigurationMock.verifyAll();
        Object.defineProperty(process, 'platform', {
            value: originalPlatform,
        });
        Object.defineProperty(net, 'createConnection', {
            value: originalCreateConnectionFn,
        });
    });

    it('skip unsupported platforms', async () => {
        Object.defineProperty(process, 'platform', {
            value: 'darwin',
        });

        const actualConfig = await otelConfigProvider.getConfig();
        expect(actualConfig.otelSupported).toEqual(false);
    });

    it('get windows machine configuration for docker container', async () => {
        const machineInfo = {
            container: true,
            gateway: 'host-gateway-ip',
        };
        const result = { raw: JSON.stringify(machineInfo) } as InvocationResult;
        PowerShell.$ = () => Promise.resolve(result);

        const actualConfig = await otelConfigProvider.getConfig();

        expect(actualConfig.otelListenerUrl).toEqual('http://host-gateway-ip:4317');
        expect(actualConfig.container).toEqual(true);
    });

    it('get windows machine configuration for host', async () => {
        const machineInfo = {
            container: false,
            gateway: 'host-gateway-ip',
        };
        const result = { raw: JSON.stringify(machineInfo) } as InvocationResult;
        PowerShell.$ = () => Promise.resolve(result);

        const actualConfig = await otelConfigProvider.getConfig();

        expect(actualConfig.otelListenerUrl).toEqual('http://127.0.0.1:4317');
        expect(actualConfig.container).toEqual(false);
    });

    it('get location Id', async () => {
        const ipGeolocation = {
            ip: 'ip',
            region: 'region',
        } as IpGeolocation;
        ipGeolocationProviderMock
            .setup((o) => o.getIpGeolocation())
            .returns(() => ipGeolocation)
            .verifiable();

        const actualConfig = await otelConfigProvider.getConfig();

        expect(actualConfig.locationId).toEqual('ms-loc://az/public/region');
    });

    it('skip get location Id when geolocation is unavailable', async () => {
        ipGeolocationProviderMock
            .setup((o) => o.getIpGeolocation())
            .returns(() => undefined)
            .verifiable();

        const actualConfig = await otelConfigProvider.getConfig();

        expect(actualConfig.locationId).toEqual(undefined);
    });

    it('get OTel listener status when listener is available', async () => {
        let socketCallbackFn: () => void;
        const createConnectionFn = jest.fn().mockImplementation((p, h, fn) => {
            socketCallbackFn = fn;

            return socketStub;
        });
        Object.defineProperty(net, 'createConnection', {
            value: createConnectionFn,
        });
        const invokeSocketCallbackFn = async () => {
            do {
                await System.wait(10);
                if (socketCallbackFn) {
                    socketCallbackFn();
                }
            } while (socketCallbackFn === undefined);
        };

        const result = await Promise.all([invokeSocketCallbackFn(), otelConfigProvider.getConfig()]);
        const actualConfig = result[1];

        expect(actualConfig.hasOTelListener).toEqual(true);
        expect(createConnectionFn).toBeCalledWith((otelConfigProvider as any).OTelListenerPort, '127.0.0.1', socketCallbackFn);
    });

    it('get OTel listener status when listener is not available', async () => {
        const createConnectionFn = jest.fn().mockImplementation(() => socketStub);
        Object.defineProperty(net, 'createConnection', {
            value: createConnectionFn,
        });
        let socketOnErrorCallbackFn: (e: Error) => void;
        const socketOnErrorFn = jest.fn().mockImplementation((e, fn) => {
            socketOnErrorCallbackFn = fn;

            return socketStub;
        });
        socketStub.on = socketOnErrorFn;
        const invokeSocketCallbackFn = async () => {
            do {
                await System.wait(10);
                if (socketOnErrorCallbackFn) {
                    socketOnErrorCallbackFn(new Error('ENOTFOUND'));
                }
            } while (socketOnErrorCallbackFn === undefined);
        };

        const result = await Promise.all([invokeSocketCallbackFn(), otelConfigProvider.getConfig()]);
        const actualConfig = result[1];

        expect(actualConfig.hasOTelListener).toEqual(false);
        expect(socketOnErrorFn).toBeCalledWith('error', socketOnErrorCallbackFn);
    });

    it('get OTel listener status when listener socket is timed out', async () => {
        (otelConfigProvider as any).otelListenerTimeout = 100;
        let socketCallbackFn: () => void;
        let socketOnErrorCallbackFn: (e: Error) => void;

        const createConnectionFn = jest.fn().mockImplementation((p, h, fn) => {
            socketCallbackFn = jest.fn(fn);

            return socketStub;
        });
        Object.defineProperty(net, 'createConnection', {
            value: createConnectionFn,
        });
        const socketOnErrorFn = jest.fn().mockImplementation((e, fn) => {
            socketOnErrorCallbackFn = jest.fn(fn);

            return socketStub;
        });
        socketStub.on = socketOnErrorFn;

        const actualConfig = await otelConfigProvider.getConfig();

        expect(actualConfig.hasOTelListener).toEqual(false);
        expect(socketCallbackFn).toBeCalledTimes(0);
        expect(socketOnErrorCallbackFn).toBeCalledTimes(0);
    });

    it('get service config section', async () => {
        const metricsConfig = {
            account: 'account',
            namespace: 'namespace',
            resourceId: 'resourceId',
        } as MetricsConfig;
        serviceConfigurationMock
            .setup((o) => o.getConfigValue('metricsConfig'))
            .returns(() => Promise.resolve(metricsConfig))
            .verifiable();

        const actualConfig = await otelConfigProvider.getConfig();

        expect(actualConfig.account).toEqual('account');
        expect(actualConfig.namespace).toEqual('namespace');
        expect(actualConfig.resourceId).toEqual('resourceId');
    });
});
