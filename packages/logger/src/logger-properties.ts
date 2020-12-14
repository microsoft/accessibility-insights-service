// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface LoggerProperties {
    [key: string]: string;
    scanId?: string;
    url?: string;
    batchRequestId?: string;
    batchJobId?: string;
    batchTaskId?: string;
    apiName?: string;
    apiVersion?: string;
    controller?: string;
    invocationId?: string;
    source?: string;
    reportId?: string;
}
