// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AsyncInterval } from 'common';
import * as fs from 'fs';
import { inject, injectable } from 'inversify';
import { isNil } from 'lodash';
import { BlobReader } from '../blob-reader';

@injectable()
export class ConfigFileUpdater {
    public static filePath = `${__dirname}/runtime-config.json`;
    public static readonly updateCheckIntervalInMilliSec = 5 * 60 * 60;

    private lastModifiedTime: Date = new Date(1, 1, 2019);
    private initializePromise: Promise<void>;

    private readonly subscribers: (() => Promise<void>)[] = [];

    constructor(
        @inject(BlobReader) private readonly blobReader: BlobReader,
        @inject(AsyncInterval) private readonly asyncInterval: AsyncInterval,
        private readonly fileSystem: typeof fs = fs,
    ) {}

    public subscribe(callback: () => Promise<void>): void {
        this.subscribers.push(callback);
    }

    public async initialize(): Promise<void> {
        if (isNil(this.initializePromise)) {
            this.initializePromise = this.setup();
        }

        return this.initializePromise;
    }

    private async setup(): Promise<void> {
        await this.triggerUpdate();

        this.asyncInterval.setIntervalExecution(async () => {
            await this.triggerUpdate();

            return true;
        }, ConfigFileUpdater.updateCheckIntervalInMilliSec);
    }

    private async triggerUpdate(): Promise<void> {
        const currentTime = new Date();
        const response = await this.blobReader.getModifiedBlobContent(
            'runtime-configuration',
            'runtime-config.json',
            this.lastModifiedTime,
        );
        this.lastModifiedTime = currentTime;
        if (response.isModified) {
            await this.writeToFile(response.updatedContent);
            await this.notifySubscribers();
        }
    }

    private async writeToFile(updatedContent: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.fileSystem.writeFile(ConfigFileUpdater.filePath, updatedContent, err => {
                if (isNil(err)) {
                    resolve();
                } else {
                    reject(err);
                }
            });
        });
    }

    private async notifySubscribers(): Promise<void> {
        this.subscribers.forEach(async callback => {
            await callback();
        });
    }
}
