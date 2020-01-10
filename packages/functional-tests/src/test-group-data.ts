// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { GuidGenerator } from 'common';
import { Logger } from 'logger';
import { OnDemandPageScanRunResultProvider, ScanRunResultResponse } from 'service-library';
import { OnDemandPageScanReport, OnDemandPageScanRunState } from 'storage-documents';
import { Url } from 'url';
import { A11yServiceClient } from 'web-api-client';
import { FunctionalTestGroup } from './test-groups/functional-test-group';

export interface TestGroupData {
    testGroupName: string;
    data?: TestContextData;
}

export interface TestContextData {
    scanUrl: string;
    scanId?: string;
    reportId?: string;
}

interface SerializableRequest {
    uri: Url;
    method: string;
    headers: { [key: string]: unknown };
}

export interface SerializableResponse<T = {}> {
    statusCode: number;
    body: T;
    headers: { [key: string]: unknown };
    request: SerializableRequest;
}

export type FunctionalTestGroupCreator = (
    a11yServiceClient: A11yServiceClient,
    onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
    logger: Logger,
    guidGenerator: GuidGenerator,
) => FunctionalTestGroup;
