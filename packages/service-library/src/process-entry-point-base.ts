// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { DotenvConfigOutput } from 'dotenv';
import { Container } from 'inversify';
import { BaseTelemetryProperties, Logger, loggerTypes } from 'logger';

// tslint:disable: no-any

export abstract class ProcessEntryPointBase {
    constructor(private readonly container: Container) {}

    public async start(...args: any[]): Promise<void> {
        let loggerInitialized = false;
        let logger: Logger;

        try {
            const dotEnvConfig: DotenvConfigOutput = this.container.get(loggerTypes.DotEnvConfig);
            logger = this.container.get(Logger);

            await logger.setup(this.getTelemetryBaseProperties());
            loggerInitialized = true;
            this.verifyDotEnvParsing(dotEnvConfig, logger);

            await this.invokeCustomActionWithLogging(this.container, logger, ...args);
        } catch (error) {
            if (loggerInitialized === false) {
                console.log('Unable to setup logger.', error);
            } else {
                logger.trackExceptionAny(error, '[ProcessEntryPointBase] Unhandled exception');
            }

            throw error;
        } finally {
            if (loggerInitialized === true) {
                logger.flush();
            }
        }
    }

    protected abstract getTelemetryBaseProperties(): BaseTelemetryProperties;

    protected abstract async runCustomAction(container: Container, ...args: any[]): Promise<void>;

    private async invokeCustomActionWithLogging(container: Container, logger: Logger, ...args: any[]): Promise<void> {
        try {
            await this.runCustomAction(container, ...args);
        } catch (error) {
            logger.trackExceptionAny(error, '[ProcessEntryPointBase] Error occurred while executing action.');
            throw error;
        }
    }

    private verifyDotEnvParsing(dotEnvConfig: DotenvConfigOutput, logger: Logger): void {
        if (dotEnvConfig.parsed !== undefined) {
            logger.logInfo('[ProcessEntryPointBase] Config based environment variables:');
            logger.logInfo(`[ProcessEntryPointBase] ${JSON.stringify(dotEnvConfig.parsed, undefined, 2)}`);
        }

        if (dotEnvConfig.error !== undefined) {
            logger.logWarn(`[ProcessEntryPointBase] Unable to load env config file. ${dotEnvConfig.error}`);
        }
    }
}
