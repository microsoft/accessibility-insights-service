import * as appInsights from 'applicationinsights';
import { Container } from 'inversify';
import { Logger } from './logger';
import { loggerTypes } from './logger-types';
import { registerLoggerToContainer } from './register-logger-to-container';

describe(registerLoggerToContainer, () => {
    let container: Container;

    beforeEach(() => {
        container = new Container();
    });

    it('verify logger dependency resolution', () => {
        registerLoggerToContainer(container);

        expect(container.get(loggerTypes.AppInsights)).toBe(appInsights);
        expect(container.get(loggerTypes.Process)).toBe(process);
    });

    it('verify logger resolution', () => {
        registerLoggerToContainer(container);

        const telemetryClient = container.get(Logger);

        expect(telemetryClient).toBeDefined();
        expect(telemetryClient).toBe(container.get(Logger));
    });
});
