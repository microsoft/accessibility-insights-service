// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/*
Contains config values which are set through environment variables.
This should only be constructed in HealthMonitorControllerFunc
so orchestration results are deterministic on retry.
*/
export class WebApiConfig {
    public readonly baseUrl: string = process.env.WEB_API_BASE_URL;
    public readonly releaseId: string = process.env.RELEASE_VERSION;
}
