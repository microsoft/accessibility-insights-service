// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ApplicationInsightsClient } from 'azure-services';

export const webApiTypeNames = {
    ApplicationInsightsClientProvider: 'ApplicationInsightsClientProvider',
};

export type ApplicationInsightsClientProvider = () => Promise<ApplicationInsightsClient>;
