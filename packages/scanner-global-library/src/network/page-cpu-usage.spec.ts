// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import os, { CpuInfo } from 'os';
import { IMock, Mock } from 'typemoq';
import { GlobalLogger } from 'logger';
import * as Puppeteer from 'puppeteer';
import { PageCpuUsage } from './page-cpu-usage';

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock(
    'pidusage',
    () => async () =>
        Promise.resolve({
            cpu: 20,
            memory: 100,
            ppid: 1,
            pid: 2,
            timestamp: 200,
        }),
);

const pid = '2204';

let loggerMock: IMock<GlobalLogger>;
let pageCpuUsage: PageCpuUsage;
let puppeteerPageMock: IMock<Puppeteer.Page>;

describe(PageCpuUsage, () => {
    beforeEach(() => {
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        loggerMock = Mock.ofType(GlobalLogger);

        os.cpus = () => [{} as CpuInfo, {} as CpuInfo];
        setupBrowserPid();

        pageCpuUsage = new PageCpuUsage(loggerMock.object);
    });

    afterEach(() => {
        puppeteerPageMock.verifyAll();
        loggerMock.verifyAll();
    });

    test('Get browser CPU stats', async () => {
        const expectedCpuUsage = {
            cpus: 2,
            average: 20,
            snapshots: [
                {
                    cpu: 20,
                    memory: 100,
                    ppid: 1,
                    pid: 2,
                    timestamp: 200,
                },
                {
                    cpu: 20,
                    memory: 100,
                    ppid: 1,
                    pid: 2,
                    timestamp: 200,
                },
            ],
        };

        const cpuUsage = await pageCpuUsage.getCpuUsage(puppeteerPageMock.object, 2, 100);

        expect(cpuUsage).toEqual(expectedCpuUsage);
    });
});

function setupBrowserPid(): void {
    // page.browser().process().pid;
    const processStub = {
        pid,
    };
    const browserStub = {
        process: () => processStub,
    } as any;
    puppeteerPageMock
        .setup((o) => o.browser())
        .returns(() => browserStub)
        .verifiable();
}
