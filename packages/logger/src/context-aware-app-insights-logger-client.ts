// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TelemetryClient } from 'applicationinsights';
import { inject, injectable } from 'inversify';
import { merge } from 'lodash';
import { AppInsightsLoggerClient } from './app-insights-logger-client';
import { BaseAppInsightsLoggerClient } from './base-app-insights-logger-client';
import { LoggerProperties } from './logger-client';

@injectable()
export class ContextAwareAppInsightsLoggerClient extends BaseAppInsightsLoggerClient {
    constructor(
        @inject(AppInsightsLoggerClient) private readonly globalLoggerClient: AppInsightsLoggerClient,
        protected getTelemetryClient: () => TelemetryClient = () => new TelemetryClient(),
    ) {
        super();
    }

    public async setup(baseProperties?: LoggerProperties): Promise<void> {
        this.telemetryClient = this.telemetryClient ?? this.getTelemetryClient();
        this.telemetryClient.commonProperties = {
            ...baseProperties,
        };

        if (!this.globalLoggerClient.isInitialized()) {
            await this.globalLoggerClient.setup();
        }

        this.initialized = true;
    }

    public isInitialized(): boolean {
        return super.isInitialized() && this.globalLoggerClient.isInitialized();
    }

    public getCommonProperties(): LoggerProperties {
        return merge(this.globalLoggerClient.getCommonProperties(), this.telemetryClient?.commonProperties);
    }
}
