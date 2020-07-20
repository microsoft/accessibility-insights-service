// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { getTaskCorrelationId, JobTask } from './job-task';

describe(JobTask, () => {
    let jobTask: JobTask;

    it('id should include correlation value', () => {
        const correlationId = `correlationId_${new Date().valueOf()}`;
        jobTask = new JobTask(correlationId);

        expect(jobTask.correlationId).toEqual(correlationId);
        expect(jobTask.id).toContain(correlationId);
        expect(jobTask.id.startsWith('task_')).toBe(true);
    });

    it('id should not exceed the maximum length', () => {
        const correlationId = 'x'.repeat(64);

        expect(() => new JobTask(correlationId)).toThrowError(/correlationId string value is too long/);
    });
});

describe(getTaskCorrelationId, () => {
    it('get correlation id', () => {
        expect('correlationId').toEqual(getTaskCorrelationId('abc_correlationId'));
        expect(undefined).toEqual(getTaskCorrelationId('abcdef'));
    });
});
