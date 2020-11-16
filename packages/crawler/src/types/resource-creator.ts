// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';

export interface ResourceCreator {
    createRequestQueue(baseUrl: string, empty?: boolean, inputUrls?: string[]): Promise<Apify.RequestQueue>;
}
