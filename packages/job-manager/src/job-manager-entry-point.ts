// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Queue } from 'axis-storage';
import { Container } from 'inversify';
import { BaseEntryPoint, BaseTelemetryProperties } from 'logger';
import { Batch } from './batch/batch';
import { JobTaskExecutionResult, JobTaskState } from './batch/job-task';

export class JobManagerEntryPoint extends BaseEntryPoint {
    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return {
            source: 'jobManager',
        };
    }

    protected async runCustomAction(container: Container): Promise<void> {
        const queue = container.get(Queue);
        const scanMessages = await queue.getMessages();

        const batch = container.get(Batch);
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
    }
}
