import { Context } from '@azure/functions';
import * as appInsights from 'applicationinsights';

declare var __IMAGE_VERSION__: string;

export function createTelemetryClient(context: Context, appInsightsObject: typeof appInsights): appInsights.TelemetryClient {
    appInsightsObject.setup();

    appInsightsObject.defaultClient.commonProperties = {
        imageVersion: __IMAGE_VERSION__,
        ...context.executionContext,
    };

    appInsightsObject.start();

    appInsightsObject.defaultClient.trackEvent({ name: 'FunctionStarted' });

    return appInsightsObject.defaultClient;
}
