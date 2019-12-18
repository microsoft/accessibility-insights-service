// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AvailabilityTelemetry } from 'logger';
import { Url } from 'url';

export interface ActivityRequestData {
    activityName: string;
    data?: unknown;
}

export interface CreateScanRequestData {
    scanUrl: string;
    priority: number;
}

export interface GetScanResultData {
    scanId: string;
}

export interface GetScanReportData {
    scanId: string;
    reportId: string;
}

export interface TrackAvailabilityData {
    name: string;
    telemetry: AvailabilityTelemetry;
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
