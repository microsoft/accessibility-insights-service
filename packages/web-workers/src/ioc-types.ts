// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { A11yServiceClient } from 'web-api-client';

export const iocTypeNames = {
    A11yServiceClientProvider: 'A11yServiceClientProvider',
};

export type A11yServiceClientProvider = () => Promise<A11yServiceClient>;
