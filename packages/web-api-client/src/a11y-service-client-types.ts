// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { A11yServiceClient } from './a11y-service-client';

export const a11yServiceClientTypeNames = {
    A11yServiceClientProvider: 'A11yServiceClientProvider',
};

export type A11yServiceClientProvider = () => Promise<A11yServiceClient>;
