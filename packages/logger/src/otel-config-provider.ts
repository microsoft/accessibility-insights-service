// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as net from 'net';
import { inject, injectable } from 'inversify';
import { PowerShell } from 'node-powershell';
import { IpGeolocation, IpGeolocationProvider, MetricsConfig, ServiceConfiguration } from 'common';
import moment from 'moment';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface OTelConfig {
    supported: boolean;
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
    private readonly OTelListenerPort = 4317; // default agent listener port

    private readonly localhost = '127.0.0.1';

    public constructor(
        @inject(IpGeolocationProvider) private readonly ipGeolocationProvider: IpGeolocationProvider,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
    ) {}

    public async getConfig(): Promise<OTelConfig> {
        // OTLP metrics collection is enabled for Windows platform only
        if (process.platform !== 'win32') {
            this.logTrace(`OTLP metrics collection is not supported on this platform.`);

            return {
                supported: false,
            };
        }

        const machineInfo = await this.getMachineInfo();
        const hasOTelListener = await this.validateOTelListeners(machineInfo.host);
        const metricsConfig = await this.getMetricsConfig();
        const ipGeolocation = this.ipGeolocationProvider.getIpGeolocation();

        const config = this.getOTelConfig(hasOTelListener, machineInfo, metricsConfig, ipGeolocation);
        this.logTrace(`OTLP metrics collection configuration.`, config);

        return config;
    }

    private async getMachineInfo(): Promise<MachineInfo> {
        const result = await PowerShell.$`
        $container = (Get-ItemProperty "HKLM:\\SYSTEM\\CurrentControlSet\\Control").ContainerType -eq 2
        $defaultGateway = (Get-NetRoute '0.0.0.0/0').NextHop
        
        return @{container = $container; gateway = $defaultGateway} | ConvertTo-Json
        `;

        if (result.hadErrors === true) {
            throw new Error(`The PowerShell script has failed to execute. ${result.stderr.toString()}`);
        }

        const systemInfo = JSON.parse(result.raw);
        const host = systemInfo.container === true ? systemInfo.gateway : this.localhost;

        return { container: systemInfo.container, host };
    }

    private async validateOTelListeners(host: string): Promise<boolean> {
        const timeout = 3000;

        let timerId;
        let timerExpired = false;
        let error: any;

        const timer = new Promise<void>((resolve) => {
            timerId = setTimeout(() => {
                timerExpired = true;
                resolve();
            }, timeout);
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
            hasOTelListener === true ||
            metricsConfig?.account !== undefined ||
            metricsConfig?.namespace !== undefined ||
            metricsConfig?.resourceId !== undefined;

        return {
            supported,
            container: machineInfo.container,
            hasOTelListener,
            otelListenerUrl: this.getOTelListenerUrl(machineInfo.host),
            ...metricsConfig,
            locationId: this.getLocationId(ipGeolocation.region),
        };
    }

    private getOTelListenerUrl(host: string): string {
        return `http://${host}:${this.OTelListenerPort}`;
    }

    private getLocationId(region: string): string {
        return `ms-loc://az/Public/${region}`;
    }

    private async getMetricsConfig(): Promise<MetricsConfig> {
        return this.serviceConfig.getConfigValue('metricsConfig');
    }

    private logTrace(message: string, properties: any = {}): void {
        const data = {
            source: 'OTelLoggerClient',
            ...properties,
        };
        console.log(`[${moment.utc().toISOString()}][Trace][Info] ${message}\n${JSON.stringify(data)}`);
    }
}
