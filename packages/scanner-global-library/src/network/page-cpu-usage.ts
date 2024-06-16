// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import os from 'os';
import { System } from 'common';
import { injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';
import pidusage from 'pidusage';
import { meanBy } from 'lodash';

export interface CpuUsage {
    /**
     * percentage (from 0 to 100*vcore)
     */
    cpu: number;

    /**
     * bytes
     */
    memory: number;

    /**
     * PPID
     */
    ppid: number;

    /**
     * PID
     */
    pid: number;

    /**
     * msec since epoch
     */
    timestamp: number;
}

export interface CpuUsageStats {
    cpus: number;
    average: number;
    snapshots: CpuUsage[];
}

@injectable()
export class PageCpuUsage {
    public async getCpuUsage(page: Puppeteer.Page, samples: number = 5, sampleIntervalMsec: number = 500): Promise<CpuUsageStats> {
        const snapshots: CpuUsage[] = [];
        const pid = page.browser().process().pid;

        let count = 0;
        while (count++ < samples) {
            const usage = await pidusage(pid);
            snapshots.push({
                cpu: usage.cpu,
                memory: usage.memory,
                ppid: usage.ppid,
                pid: usage.pid,
                timestamp: usage.timestamp,
            });

            await System.wait(sampleIntervalMsec);
        }

        const average = meanBy(snapshots, (s) => s.cpu);
        const stats = {
            cpus: os.cpus().length,
            average,
            snapshots,
        };

        return stats;
    }
}
