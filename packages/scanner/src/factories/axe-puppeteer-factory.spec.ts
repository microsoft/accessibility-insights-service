// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { ScanRunTimeConfig, ServiceConfiguration } from 'common';
import * as Puppeteer from 'puppeteer';
import { IMock, Mock } from 'typemoq';
import { AxePuppeteerFactory } from './axe-puppeteer-factory';

describe('AxePuppeteerFactory', () => {
    let page: IMock<Puppeteer.Page>;
    let testSubject: AxePuppeteerFactory;
    let serviceConfigMock: IMock<ServiceConfiguration>;
    let scanConfig: ScanRunTimeConfig;
    beforeEach(() => {
        scanConfig = {
            failedPageRescanIntervalInHours: 3,
            maxScanRetryCount: 4,
            maxSendNotificationRetryCount: 3,
            minLastReferenceSeenInDays: 5,
            pageRescanIntervalInDays: 6,
            accessibilityRuleExclusionList: [],
            scanTimeoutInMin: 1,
        };
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        serviceConfigMock.setup(async s => s.getConfigValue('scanConfig')).returns(async () => scanConfig);
        page = Mock.ofType<Puppeteer.Page>();
        testSubject = new AxePuppeteerFactory(serviceConfigMock.object);
    });
    it('create axe puppeteer instance', async () => {
        const axePuppeteer = await testSubject.createAxePuppeteer(page.object);
        expect(axePuppeteer).toBeDefined();
    });
});
