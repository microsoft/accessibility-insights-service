// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { System } from 'common';
import { DotenvConfigOutput } from 'dotenv';
import { Container } from 'inversify';
import { BaseTelemetryProperties, GlobalLogger, loggerTypes } from 'logger';

/* eslint-disable @typescript-eslint/no-explicit-any */

export abstract class ProcessEntryPointBase {
    constructor(private readonly container: Container) {}

    public async start(...args: any[]): Promise<void> {
        let loggerInitialized = false;
        let logger: GlobalLogger;

        try {
            const dotEnvConfig: DotenvConfigOutput = this.container.get(loggerTypes.DotEnvConfig);

            logger = this.container.get(GlobalLogger);
            await logger.setup(this.getTelemetryBaseProperties());
            loggerInitialized = true;

            this.verifyDotEnvParsing(dotEnvConfig, logger);

            await this.runCustomAction(this.container, ...args);
        } catch (error) {
            if (loggerInitialized === true) {
                logger.logError('Error occurred while executing main process.', { error: System.serializeError(error) });
            } else {
                console.log('Error occurred while executing main process.', { error: System.serializeError(error) });
            }
            throw error;
        } finally {
            if (loggerInitialized === true) {
                logger.logInfo('Flushing telemetry events.');
                await logger.flush();
            }
        }
    }

    protected abstract getTelemetryBaseProperties(): BaseTelemetryProperties;

    protected abstract runCustomAction(container: Container, ...args: any[]): Promise<void>;

    private verifyDotEnvParsing(dotEnvConfig: DotenvConfigOutput, logger: GlobalLogger): void {
        if (dotEnvConfig.parsed !== undefined) {
            logger.logInfo(`Loaded environment variables from the .env config file.\n${JSON.stringify(dotEnvConfig.parsed, undefined, 2)}`);
        }

        if (dotEnvConfig.error !== undefined) {
            logger.logWarn(`Unable to load the .env config file. ${dotEnvConfig.error}`);
        }
    }
}
