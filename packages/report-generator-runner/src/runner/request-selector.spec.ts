// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { ReportGeneratorRequestProvider } from 'service-library';
import { ServiceConfiguration, ScanRunTimeConfig } from 'common';
import { CosmosOperationResponse } from 'azure-services';
import * as MockDate from 'mockdate';
import moment from 'moment';
import { ReportGeneratorRequest } from 'storage-documents';
import { RequestSelector } from './request-selector';

const continuationToken = 'continuationToken';
const scanGroupId = 'scanGroupId';

let reportGeneratorRequestProviderMock: IMock<ReportGeneratorRequestProvider>;
let serviceConfigMock: IMock<ServiceConfiguration>;
let requestSelector: RequestSelector;
let queryCount: number;
let dateNow: Date;

describe(RequestSelector, () => {
    beforeEach(() => {
        dateNow = new Date();
        MockDate.set(dateNow);

        queryCount = 10;

        reportGeneratorRequestProviderMock = Mock.ofType<ReportGeneratorRequestProvider>();
        serviceConfigMock = Mock.ofType<ServiceConfiguration>();
        serviceConfigMock
            .setup((o) => o.getConfigValue('scanConfig'))
            .returns(() =>
                Promise.resolve({
                    failedScanRetryIntervalInMinutes: 10,
                    maxFailedScanRetryCount: 2,
                } as ScanRunTimeConfig),
            )
            .verifiable(Times.atLeastOnce());

        requestSelector = new RequestSelector(reportGeneratorRequestProviderMock.object, serviceConfigMock.object);
    });

    afterEach(() => {
        MockDate.reset();
        reportGeneratorRequestProviderMock.verifyAll();
        serviceConfigMock.verifyAll();
    });

    it('filter queued requests', async () => {
        const queuedRequests = [
            {
                id: 'id0', // pending - process:pending
            },
            {
                id: 'id1', // completed - delete:completed
                run: {
                    state: 'completed',
                },
            },
            {
                id: 'id2', // failed no retry - delete:failed
                run: {
                    state: 'failed',
                    retryCount: 10,
                },
            },
            {
                id: 'id3', // abandon scan with no retry - delete:failed
                run: {
                    state: 'running',
                    retryCount: 10,
                    timestamp: moment(dateNow).add(-10, 'minutes').toJSON(),
                },
            },
            {
                id: 'id4', // pending - process:pending
                run: {
                    state: 'pending',
                },
            },
            {
                id: 'id5', // abandon scan with retry - process:retry
                run: {
                    state: 'running',
                    retryCount: 1,
                    timestamp: moment(dateNow).add(-10, 'minutes').toJSON(),
                },
            },
            {
                id: 'id6', // failed with retry - process:retry
                run: {
                    state: 'failed',
                    retryCount: 1,
                    timestamp: moment(dateNow).add(-10, 'minutes').toJSON(),
                },
            },
            {
                id: 'id7', // scan is running within run window threshold - skip
                run: {
                    state: 'running',
                    timestamp: moment(dateNow).toJSON(),
                },
            },
        ] as ReportGeneratorRequest[];

        const response1 = {
            item: [queuedRequests[0]],
            statusCode: 200,
            continuationToken,
        };
        reportGeneratorRequestProviderMock
            .setup((o) => o.readRequests(scanGroupId, queryCount, undefined))
            .returns(() => Promise.resolve(response1 as CosmosOperationResponse<ReportGeneratorRequest[]>))
            .verifiable();

        const response2 = {
            item: queuedRequests.slice(1),
            statusCode: 200,
        };
        reportGeneratorRequestProviderMock
            .setup((o) => o.readRequests(scanGroupId, queryCount, continuationToken))
            .returns(() => Promise.resolve(response2 as CosmosOperationResponse<ReportGeneratorRequest[]>))
            .verifiable();

        const filteredRequests = {
            requestsToProcess: [
                { request: queuedRequests[0], condition: 'pending' },
                { request: queuedRequests[4], condition: 'pending' },
                { request: queuedRequests[5], condition: 'retry' },
                { request: queuedRequests[6], condition: 'retry' },
            ],
            requestsToDelete: [
                { request: queuedRequests[1], condition: 'completed' },
                { request: queuedRequests[2], condition: 'failed' },
                { request: queuedRequests[3], condition: 'failed' },
            ],
        };

        const result = await requestSelector.getQueuedRequests(scanGroupId, queryCount);

        expect(result.requestsToDelete).toEqual(filteredRequests.requestsToDelete);
        expect(result.requestsToProcess).toEqual(filteredRequests.requestsToProcess);
    });
});
