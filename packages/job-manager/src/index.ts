import { VError } from 'verror';
import './4env';
import { Batch } from './batch/batch';
import { batchConfig } from './batch/batch-config';
import { Queue } from './storage/queue';
import { storageConfig } from './storage/storage-config';
import { JobTaskState, JobTaskExecutionResult } from './batch/job-task';

(async () => {
    const queue = new Queue(storageConfig);
    const scanMessages = await queue.getMessages();

    const batch = new Batch(batchConfig);
    const jobId = await batch.createJobIfNotExists(process.env.AZ_BATCH_JOB_ID, true);
    await batch.createTasks(jobId, scanMessages);

    await batch.waitJob(jobId);

    const jobTasks = await batch.getCreatedTasksState(jobId);
    jobTasks.forEach(async jobTask => {
        if (jobTask.state === JobTaskState.completed && jobTask.result === JobTaskExecutionResult.success) {
            const message = scanMessages.find(value => value.messageId === jobTask.correlationId);
            await queue.deleteMessage(message);
        }
    });
})().catch(error => {
    console.error(new VError(error, 'An error occurred while processing job.'));
});
