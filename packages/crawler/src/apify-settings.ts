// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface ApifySettings {
    APIFY_HEADLESS?: string;
    APIFY_LOCAL_STORAGE_DIR?: string;
}

const defaultSettings: ApifySettings = {
    APIFY_HEADLESS: 'true',
};

export function setApifyEnvVars(settings?: ApifySettings): void {
    const allSettings = {
        ...defaultSettings,
        ...settings,
    };
    Object.keys(allSettings).forEach((key: keyof ApifySettings) => {
        process.env[`${key}`] = allSettings[key];
    });
}
