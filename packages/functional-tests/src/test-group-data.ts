// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { OnDemandPageScanReport, OnDemandPageScanRunState } from 'storage-documents';
import { Url } from 'url';

export interface TestGroupData {
    testGroupName: string;
    data?: TestContextData;
}

export interface TestContextData {
    scanUrl: string;
    scanId?: string;
    scanRunState?: OnDemandPageScanRunState;
    reports?: OnDemandPageScanReport[];
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
