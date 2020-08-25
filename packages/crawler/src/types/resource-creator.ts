// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';

export interface ResourceCreator {
    createRequestList(existingUrls: string[]): Promise<Apify.RequestList>;
    createRequestQueue(baseUrl: string, empty?: boolean, inputFile?: string, existingUrls?: string[]): Promise<Apify.RequestQueue>;
}
