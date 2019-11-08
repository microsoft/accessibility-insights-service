// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TelemetryClient } from 'applicationinsights';
import { inject, injectable } from 'inversify';
import { AppInsightsLoggerClient } from './app-insights-logger-client';
import { BaseAppInsightsLoggerClient } from './base-app-insights-logger-client';

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
    }

    protected getAdditionalPropertiesToAddToEvent(): { [key: string]: string } {
        return this.rootLoggerClient.getDefaultProperties();
    }
}
