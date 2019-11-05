// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TelemetryClient } from 'applicationinsights';
import { inject, injectable } from 'inversify';
import { BaseTelemetryProperties, LoggerProperties } from '.';
import { BaseAppInsightsLoggerClient } from './base-app-insights-logger-client';
import { RootAppInsightsLoggerClient } from './root-app-insights-logger-client';

@injectable()
export class ContextAppInsightsContextLoggerClient extends BaseAppInsightsLoggerClient {
    constructor(@inject(RootAppInsightsLoggerClient) private readonly rootLoggerClient: RootAppInsightsLoggerClient) {
        super();
    }

    public async setup(baseProperties?: BaseTelemetryProperties): Promise<void> {
        this.telemetryClient = new TelemetryClient();

        this.telemetryClient.commonProperties = {
            ...baseProperties,
        };
    }

    protected getAdditionalPropertiesToAddToEvent(): { [key: string]: string } {
        return this.rootLoggerClient.getDefaultProperties();
    }
}
