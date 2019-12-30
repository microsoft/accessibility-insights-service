// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TelemetryClient } from 'applicationinsights';
import { inject, injectable } from 'inversify';
import { AppInsightsLoggerClient } from './app-insights-logger-client';
import { BaseAppInsightsLoggerClient } from './base-app-insights-logger-client';
import { LogLevel } from './logger';

@injectable()
export class ContextAwareAppInsightsLoggerClient extends BaseAppInsightsLoggerClient {
    constructor(@inject(AppInsightsLoggerClient) private readonly rootLoggerClient: AppInsightsLoggerClient) {
        super();
    }

    public async setup(baseProperties?: { [property: string]: string }): Promise<void> {
        this.telemetryClient = new TelemetryClient();

        this.telemetryClient.commonProperties = {
            ...baseProperties,
        };

        if (!this.rootLoggerClient.isInitialized()) {
            await this.rootLoggerClient.setup();
        }
        this.initialized = true;
    }

    public isInitialized(): boolean {
        return super.isInitialized() && this.rootLoggerClient.isInitialized();
    }

    protected getAdditionalPropertiesToAddToEvent(): { [key: string]: string } {
        return this.rootLoggerClient.getDefaultProperties();
    }
}
