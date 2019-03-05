import { JobTask } from './job-task';

describe(JobTask, () => {
    let jobTask: JobTask;

    it('id should include correlation value', () => {
        const correlationId = `correlationId_${Math.random()}`;
        jobTask = new JobTask(correlationId);

        expect(jobTask.correlationId).toEqual(correlationId);
        expect(jobTask.id).toContain(correlationId);
    });

    it('id should not exceed the maximum length', () => {
        const correlationId = 'x'.repeat(64);

        expect(() => new JobTask(correlationId)).toThrowError(/correlationId string value is too long/);
    });
});
