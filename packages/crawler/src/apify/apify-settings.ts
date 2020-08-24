// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface ApifySettings {
    APIFY_HEADLESS?: string;
    APIFY_LOCAL_STORAGE_DIR?: string;
}

export function setApifySettings(settings?: ApifySettings): void {
    Object.keys(settings).forEach((key: keyof ApifySettings) => {
        if (settings[key] !== undefined) {
            process.env[`${key}`] = settings[key];
        }
    });
}
