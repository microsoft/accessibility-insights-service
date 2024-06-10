// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { System } from 'common';
import { injectable, inject, optional } from 'inversify';
import { GlobalLogger } from 'logger';
import * as Puppeteer from 'puppeteer';

interface CpuActiveTime {
    timestamp: number;
    activeTime: number;
}

interface CpuUsageSnapshot {
    activeTime: CpuActiveTime;
    usage: number;
}

export interface CpuUsage {
    timestamp: number;
    usage: number;
}

export interface CpuUsageStats {
    average: number;
    snapshots: CpuUsage[];
}

@injectable()
export class PageCpuUsage {
    constructor(@inject(GlobalLogger) @optional() private readonly logger: GlobalLogger) {}

    // to do CPU throttling

    public async getCpuUsage(page: Puppeteer.Page, intervalMsec: number, sampleIntervalMsec: number = 1000): Promise<CpuUsageStats> {
        const cdp = await page.createCDPSession();
        await cdp.send('Performance.enable', {
            timeDomain: 'timeTicks',
        });

        const snapshots: CpuUsage[] = [];
        const initialActiveTime = await this.getCpuActiveTime(cdp);
        let lastActiveTime = initialActiveTime;

        const timestamp = System.getTimestamp();
        while (System.getTimestamp() < timestamp + intervalMsec) {
            await System.wait(sampleIntervalMsec);
            const usage = await this.getCpuUsageSnapshot(cdp, lastActiveTime);
            lastActiveTime = usage.activeTime;
            snapshots.push({
                timestamp: usage.activeTime.timestamp,
                usage: usage.usage,
            });
        }

        await cdp.detach();

        const average = lastActiveTime.activeTime / (lastActiveTime.timestamp - initialActiveTime.timestamp);
        this.logger?.logInfo(`Page CPU load average load ${average * 100} %`, {
            average: average.toString(),
            snapshots: JSON.stringify(snapshots),
        });

        return {
            average,
            snapshots,
        };
    }

    private async getCpuUsageSnapshot(cdp: Puppeteer.CDPSession, lastActiveTime: CpuActiveTime): Promise<CpuUsageSnapshot> {
        const sampleActiveTime = await this.getCpuActiveTime(cdp);
        const sampleDuration = sampleActiveTime.timestamp - lastActiveTime.timestamp;
        const usage = (sampleActiveTime.activeTime - lastActiveTime.activeTime) / sampleDuration;

        return {
            activeTime: sampleActiveTime,
            usage: usage > 1 ? 1 : usage,
        };
    }

    private async getCpuActiveTime(cdp: Puppeteer.CDPSession): Promise<CpuActiveTime> {
        const metrics = await cdp.send('Performance.getMetrics');
        const activeTime = metrics.metrics
            .filter((m) => m.name.includes('Duration'))
            .map((m) => m.value)
            .reduce((a, b) => a + b);

        return {
            timestamp: metrics.metrics.find((m) => m.name === 'Timestamp')?.value || 0,
            activeTime,
        };
    }
}
