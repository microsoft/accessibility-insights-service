import * as crypto from 'crypto';
import { VError } from 'verror';

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
            throw new VError(
                `The correlationId string value is too long. Maximum length is ${maxLength - (prefix.length - this.correlationId.length)}`,
            );
        }

        this.id = `${prefix}${crypto.randomBytes(size).toString('hex')}`;
    }
}
