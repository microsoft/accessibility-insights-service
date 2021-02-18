// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface ApifySettings {
    APIFY_HEADLESS?: string;
    APIFY_LOCAL_STORAGE_DIR?: string;
    APIFY_MEMORY_MBYTES?: string;
    APIFY_CHROME_EXECUTABLE_PATH?: string;
}

export interface ApifySettingsHandler {
    setApifySettings(settings: ApifySettings): void;
    getApifySettings(): ApifySettings;
}

export const apifySettingsHandler: ApifySettingsHandler = {
    setApifySettings(settings: ApifySettings): void {
        Object.keys(settings).forEach((key: keyof ApifySettings) => {
            if (settings[key] !== undefined) {
                process.env[`${key}`] = settings[key];
            }
        });
    },

    getApifySettings(): ApifySettings {
        return {
            ...process.env,
        };
    },
};
