// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { ReportGeneratorRequestProvider } from 'service-library';
import { ServiceConfiguration, ScanRunTimeConfig } from 'common';
import { CosmosOperationResponse } from 'azure-services';
import * as MockDate from 'mockdate';
import _ from 'lodash';
import moment from 'moment';
import { ReportGeneratorRequest } from 'storage-documents';
import { RequestSelector } from './request-selector';

const continuationToken = 'continuationToken';

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
                    failedScanRetryIntervalInMinutes: 1,
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

    it('filter requests', async () => {
        const requests = [
            {
                id: 'id1',
                run: {
                    state: 'completed',
                },
            },
            {
                id: 'id2',
                run: {
                    state: 'failed',
                    retryCount: 10,
                },
            },
            {
                id: 'id3',
                run: {
                    state: 'pending',
                },
            },
            {
                id: 'id4',
                run: {
                    state: 'running',
                    retryCount: 1,
                    timestamp: moment(dateNow).add(-10, 'minutes').toJSON(),
                },
            },
        ] as ReportGeneratorRequest[];

        const response1 = {
            item: [requests[0]],
            statusCode: 200,
            continuationToken,
        };
        reportGeneratorRequestProviderMock
            .setup((o) => o.readRequests(undefined, queryCount))
            .returns(() => Promise.resolve(response1 as CosmosOperationResponse<ReportGeneratorRequest[]>))
            .verifiable();

        const response2 = {
            item: requests.slice(1),
            statusCode: 200,
        };
        reportGeneratorRequestProviderMock
            .setup((o) => o.readRequests(continuationToken, queryCount))
            .returns(() => Promise.resolve(response2 as CosmosOperationResponse<ReportGeneratorRequest[]>))
            .verifiable();

        const filteredScanRequests = {
            requestsToProcess: [
                { request: requests[2], condition: 'pending' },
                { request: requests[3], condition: 'retry' },
            ],
            requestsToDelete: [
                { request: requests[0], condition: 'completed' },
                { request: requests[1], condition: 'noRetry' },
            ],
        };

        const result = await requestSelector.getRequests(queryCount);

        expect(result).toEqual(filteredScanRequests);
    });
});
