// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';
import { ApifySettings, apifySettingsHandler } from './apify-settings';

describe('Apify settings', () => {
    const defaultEnv: ApifySettings = {
        CRAWLEE_HEADLESS: '',
        CRAWLEE_STORAGE_DIR: '',
        CRAWLEE_CHROME_EXECUTABLE_PATH: '',
    };

    beforeEach(() => {
        Object.keys(defaultEnv).forEach((key: keyof ApifySettings) => {
            if (defaultEnv[key] !== undefined) {
                process.env[`${key}`] = defaultEnv[key];
            }
        });
    });

    it('sets env vars', () => {
        const overrideSettings: ApifySettings = {
            CRAWLEE_HEADLESS: '0',
            CRAWLEE_STORAGE_DIR: 'local storage dir',
        };

        verifyEnvVarsSet(defaultEnv);

        apifySettingsHandler.setApifySettings(overrideSettings);

        verifyEnvVarsSet(overrideSettings);
    });

    it('does not override setting if undefined', () => {
        const presetLocalStorageDir = 'local storage dir';
        const expectedEnvVars: ApifySettings = {
            CRAWLEE_STORAGE_DIR: presetLocalStorageDir,
        };
        const settings: ApifySettings = {
            CRAWLEE_STORAGE_DIR: undefined,
        };

        process.env.CRAWLEE_STORAGE_DIR = presetLocalStorageDir;
        verifyEnvVarsSet(expectedEnvVars);

        apifySettingsHandler.setApifySettings(settings);

        verifyEnvVarsSet(expectedEnvVars);
    });

    function verifyEnvVarsSet(expectedEnvVars: ApifySettings): void {
        Object.keys(expectedEnvVars).forEach((key: keyof ApifySettings) => {
            expect(process.env[`${key}`]).toBe(expectedEnvVars[key]);
        });
    }
});
