import { Queue, storageConfig } from 'axis-storage';
import * as _ from 'lodash';
import { VError } from 'verror';
import { config } from './4env';
import { Batch } from './batch/batch';
import { batchConfig } from './batch/batch-config';
import { JobTaskExecutionResult, JobTaskState } from './batch/job-task';

if (!_.isNil(config.parsed)) {
    console.log(JSON.stringify(config.parsed, undefined, 2));
}

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
})().catch((error: Error) => {
    console.error(new VError(error, 'An error occurred while processing job.'));
});
