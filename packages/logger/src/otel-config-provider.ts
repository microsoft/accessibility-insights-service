// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as net from 'net';
import { injectable } from 'inversify';
import { PowerShell } from 'node-powershell';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface OTelConfig {
    container: boolean;
    hasOTelListener: boolean;
    otelListenerUrl: string;
    host: string;
}

interface MachineInfo {
    container: boolean;
    host: string;
}

@injectable()
export class OTelConfigProvider {
    private readonly OTelListenerPort = 4317; // default OTLP agent gRPC listener port

    private readonly localhost = '127.0.0.1';

    public async getConfig(): Promise<OTelConfig> {
        // OTLP metrics collection is enabled for Windows platform only
        if (process.platform !== 'win32') {
            return {
                container: false,
                host: this.localhost,
                hasOTelListener: false,
                otelListenerUrl: this.getOTelListenerUrl(this.localhost),
            };
        }

        const machineInfo = await this.getMachineInfo();
        const hasOTelListener = await this.validateOTelListeners(machineInfo.host);

        return {
            container: machineInfo.container,
            host: machineInfo.host,
            hasOTelListener,
            otelListenerUrl: this.getOTelListenerUrl(machineInfo.host),
        };
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

    private getOTelListenerUrl(host: string): string {
        return `http://${host}:${this.OTelListenerPort}`;
    }
}
