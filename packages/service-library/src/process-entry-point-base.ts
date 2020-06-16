// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ServiceConfiguration, TaskRuntimeConfig } from 'common';
import { DotenvConfigOutput } from 'dotenv';
import { Container } from 'inversify';
import { isNil } from 'lodash';
import { BaseTelemetryProperties, GlobalLogger, loggerTypes } from 'logger';

// tslint:disable: no-any

export abstract class ProcessEntryPointBase {
    constructor(private readonly container: Container) {}

    public async start(...args: any[]): Promise<void> {
        let loggerInitialized = false;
        let logger: GlobalLogger;
        let processExitCode = 0;
        const processObj = this.container.get<typeof process>(loggerTypes.Process);
        let taskConfig: TaskRuntimeConfig;

        try {
            const dotEnvConfig: DotenvConfigOutput = this.container.get(loggerTypes.DotEnvConfig);
            const serviceConfig: ServiceConfiguration = this.container.get(ServiceConfiguration);
            taskConfig = await serviceConfig.getConfigValue('taskConfig');

            logger = this.container.get(GlobalLogger);
            await logger.setup(this.getTelemetryBaseProperties());
            loggerInitialized = true;

            this.verifyDotEnvParsing(dotEnvConfig, logger);

            await this.invokeCustomActionWithLogging(this.container, logger, ...args);
        } catch (error) {
            processExitCode = 1;
            if (loggerInitialized === true) {
                logger.logError('Unhandled exception while running main process.', { error: JSON.stringify(error) });
            } else {
                console.log('Unhandled exception while running main process.', { error: JSON.stringify(error) });
            }
            throw error;
        } finally {
            if (loggerInitialized === true) {
                logger.logInfo('Flushing telemetry events.');
                await logger.flush();
            }

            if (this.shouldExitAfterInvocation(taskConfig)) {
                if (loggerInitialized === true) {
                    logger.logInfo('Exiting main process.');
                } else {
                    console.log('Exiting main process.');
                }
                processObj.exit(processExitCode);
            }
        }
    }

    protected shouldExitAfterInvocation(taskConfig: TaskRuntimeConfig): boolean {
        return !isNil(taskConfig) && taskConfig.exitOnComplete;
    }

    protected abstract getTelemetryBaseProperties(): BaseTelemetryProperties;

    protected abstract async runCustomAction(container: Container, ...args: any[]): Promise<void>;

    private async invokeCustomActionWithLogging(container: Container, logger: GlobalLogger, ...args: any[]): Promise<void> {
        try {
            await this.runCustomAction(container, ...args);
        } catch (error) {
            logger.logError('Error occurred while executing main process action.', { error: JSON.stringify(error) });
            throw error;
        }
    }

    private verifyDotEnvParsing(dotEnvConfig: DotenvConfigOutput, logger: GlobalLogger): void {
        if (dotEnvConfig.parsed !== undefined) {
            logger.logInfo(`Loaded environment variables from the .env config file.\n${JSON.stringify(dotEnvConfig.parsed, undefined, 2)}`);
        }

        if (dotEnvConfig.error !== undefined) {
            logger.logWarn(`Unable to load the .env config file. ${dotEnvConfig.error}`);
        }
    }
}
