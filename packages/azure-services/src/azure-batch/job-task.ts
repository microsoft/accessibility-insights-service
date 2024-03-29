// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as crypto from 'crypto';

export declare type BatchTaskExecutionResult = 'success' | 'failure';
export declare type BatchTaskErrorCategory = 'userError' | 'serverError';

export enum JobTaskState {
    // custom states
    new = 'new',
    queued = 'queued',
    failed = 'failed',
    // built-in states
    completed = 'completed',
}

export enum JobTaskExecutionResult {
    success = 'success',
    failure = 'failure',
}

export class JobTask {
    public readonly id: string;

    public state: string = JobTaskState.new;

    public result: string;

    public error?: string;

    constructor(public correlationId: string = '') {
        const maxLength = 64;
        const prefix = `task_${this.correlationId}_`;
        const size = Math.min(Math.floor((maxLength - prefix.length) / 2), 10);
        if (size < 0) {
            throw new Error(
                `The correlationId string value is too long. Maximum length is ${maxLength - (prefix.length - this.correlationId.length)}`,
            );
        }

        this.id = `${prefix}${crypto.randomBytes(size).toString('hex')}`;
    }
}

export function getTaskCorrelationId(taskId: string): string {
    // expected taskId equals to string template '..._correlationId_...'
    const segments = taskId.split('_');

    return segments.length > 1 ? segments[1] : undefined;
}

export interface BatchTaskFailureInfo {
    category: BatchTaskErrorCategory;
    code?: string;
    message?: string;
}

export interface BatchTask {
    id: string;
    correlationId: string;
    taskArguments: any;
    exitCode: number;
    result: BatchTaskExecutionResult;
    failureInfo?: BatchTaskFailureInfo;
    timestamp: Date;
}
