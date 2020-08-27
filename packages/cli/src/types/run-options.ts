// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import Apify from 'apify';
import { ScanArguments } from './scan-arguments';

export interface PageProcessorOptions {
    requestQueue: Apify.RequestQueue;
    crawlerRunOptions: ScanArguments;
}
