import { DotenvConfigOutput } from 'dotenv';
import { Container } from 'inversify';
import { Logger } from './logger';
import { loggerTypes } from './logger-types';

export abstract class BaseEntryPoint {
    constructor(private readonly container: Container) {}

    public async start(): Promise<void> {
        let loggerInitialized = false;
        let logger: Logger;

        try {
            const dotEnvConfig: DotenvConfigOutput = this.container.get(loggerTypes.DotEnvConfig);
            logger = this.container.get(Logger);

            logger.setup();
            loggerInitialized = true;
            this.verifyDotEnvParsing(dotEnvConfig, logger);

            await this.invokeCustomActionWithLogging(this.container, logger);
        } catch (error) {
            if (loggerInitialized === false) {
                console.log('Unable to setup logger', error);
            }

            throw error;
        } finally {
            if (loggerInitialized === true) {
                logger.flush();
            }
        }
    }

    protected abstract async runCustomAction(container: Container): Promise<void>;

    private async invokeCustomActionWithLogging(container: Container, logger: Logger): Promise<void> {
        try {
            await this.runCustomAction(container);
        } catch (error) {
            logger.trackExceptionAny(error, 'Error occurred while executing job');
            throw error;
        }
    }
    private verifyDotEnvParsing(dotEnvConfig: DotenvConfigOutput, logger: Logger): void {
        if (dotEnvConfig.parsed !== undefined) {
            logger.logInfo('Config based environment variables:');
            logger.logInfo(JSON.stringify(dotEnvConfig.parsed, undefined, 2));
        }

        if (dotEnvConfig.error !== undefined) {
            logger.logWarn(`Unable to load env config file. ${dotEnvConfig.error}`);
        }
    }
}
