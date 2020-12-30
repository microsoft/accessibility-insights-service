// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';

@injectable()
export class WebApiConfig {
    public readonly baseUrl: string = process.env.WEB_API_BASE_URL;
}
