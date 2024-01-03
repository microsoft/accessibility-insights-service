// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as net from 'net';
import { inject, injectable } from 'inversify';
import { IpGeolocation, IpGeolocationProvider, MetricsConfig, ServiceConfiguration } from 'common';
import moment from 'moment';
import { isEmpty } from 'lodash';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface OTelConfig {
    otelSupported: boolean;
    container?: boolean;
    hasOTelListener?: boolean;
    otelListenerUrl?: string;
    account?: string;
    namespace?: string;
    resourceId?: string;
    locationId?: string;
}

interface MachineInfo {
    container: boolean;
    host: string;
}

@injectable()
export class OTelConfigProvider {
    private readonly otelListenerTimeout = 3000;

    private readonly OTelListenerPort = 4317; // default agent listener port

    private readonly localhost = '127.0.0.1';

    public constructor(
        @inject(IpGeolocationProvider) private readonly ipGeolocationProvider: IpGeolocationProvider,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
    ) {}

    public async getConfig(): Promise<OTelConfig> {
        // OTel metrics collection is enabled for Windows platform only
        if (process.platform !== 'win32') {
            this.logTrace(`OTel metrics collection is not supported on ${process.platform} platform.`);

            return {
                otelSupported: false,
            };
        }

        this.logTrace(`Start OTel metrics collection initialization.`);

        const machineInfo = await this.getMachineInfo();
        const hasOTelListener = await this.validateOTelListener(machineInfo.host);
        const metricsConfig = await this.getMetricsConfig();
        const ipGeolocation = this.ipGeolocationProvider.getIpGeolocation();

        const config = this.getOTelConfig(hasOTelListener, machineInfo, metricsConfig, ipGeolocation);
        this.logTrace(
            `OTel metrics collection is ${
                config.otelSupported === true
                    ? 'enabled.'
                    : 'disabled. All metricsConfig properties should be defined and OTel listener be available on a host.'
            }`,
            config,
        );

        return config;
    }

    private async getMachineInfo(): Promise<MachineInfo> {
        if (isEmpty(process.env.MACHINE_INFO)) {
            return { container: false, host: this.localhost };
        }

        const machineInfo = JSON.parse(process.env.MACHINE_INFO) as MachineInfo;

        return {
            container: machineInfo.container,
            host: machineInfo.container === true ? machineInfo.host : this.localhost,
        };
    }

    private async validateOTelListener(host: string): Promise<boolean> {
        let timerId;
        let timerExpired = false;
        let error: any;

        const timer = new Promise<void>((resolve) => {
            timerId = setTimeout(() => {
                timerExpired = true;
                resolve();
            }, this.otelListenerTimeout);
        });

        const client = new Promise<boolean>((resolve, reject) => {
            const socket = net.createConnection(this.OTelListenerPort, host, () => {
                socket.destroy();
                resolve(true);
            });

            socket.on('error', (e) => {
                socket.destroy();
                reject(e);
            });
        });

        try {
            await Promise.race([timer, client]);
        } catch (e) {
            error = e;
        } finally {
            clearTimeout(timerId);
        }

        return timerExpired === false && error === undefined;
    }

    private getOTelConfig(
        hasOTelListener: boolean,
        machineInfo: MachineInfo,
        metricsConfig: MetricsConfig,
        ipGeolocation: IpGeolocation,
    ): OTelConfig {
        const supported =
            hasOTelListener === true &&
            ipGeolocation?.region !== undefined &&
            metricsConfig?.account !== undefined &&
            metricsConfig?.namespace !== undefined &&
            metricsConfig?.resourceId !== undefined;

        return {
            otelSupported: supported,
            container: machineInfo.container,
            hasOTelListener,
            otelListenerUrl: this.getOTelListenerUrl(machineInfo.host),
            account: metricsConfig?.account,
            namespace: metricsConfig?.namespace,
            resourceId: metricsConfig?.resourceId,
            locationId: ipGeolocation?.region !== undefined ? this.getLocationId(ipGeolocation.region) : undefined,
        };
    }

    private getOTelListenerUrl(host: string): string {
        return `http://${host}:${this.OTelListenerPort}`;
    }

    private getLocationId(region: string): string {
        return `ms-loc://az/public/${region}`;
    }

    private async getMetricsConfig(): Promise<MetricsConfig> {
        return this.serviceConfig.getConfigValue('metricsConfig');
    }

    private logTrace(message: string, properties: any = {}): void {
        const data = {
            source: 'OTelLoggerClient',
            ...properties,
        };
        console.log(`[${moment.utc().toISOString()}][Trace][Info] ${message}\n${JSON.stringify(data, (k, v) => v ?? 'undefined', 2)}`);
    }
}
