// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';
import { ApifySettings, setApifySettings } from './apify-settings';

describe('Apify settings', () => {
    const defaultEnv: ApifySettings = {
        APIFY_HEADLESS: '',
        APIFY_LOCAL_STORAGE_DIR: '',
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
            APIFY_HEADLESS: '0',
            APIFY_LOCAL_STORAGE_DIR: 'local storage dir',
        };

        verifyEnvVarsSet(defaultEnv);

        setApifySettings(overrideSettings);

        verifyEnvVarsSet(overrideSettings);
    });

    it('does not override setting if undefined', () => {
        const presetLocalStorageDir = 'local storage dir';
        const expectedEnvVars: ApifySettings = {
            APIFY_LOCAL_STORAGE_DIR: presetLocalStorageDir,
        };
        const settings: ApifySettings = {
            APIFY_LOCAL_STORAGE_DIR: undefined,
        };

        process.env.APIFY_LOCAL_STORAGE_DIR = presetLocalStorageDir;
        verifyEnvVarsSet(expectedEnvVars);

        setApifySettings(settings);

        verifyEnvVarsSet(expectedEnvVars);
    });

    function verifyEnvVarsSet(expectedEnvVars: ApifySettings): void {
        Object.keys(expectedEnvVars).forEach((key: keyof ApifySettings) => {
            expect(process.env[`${key}`]).toBe(expectedEnvVars[key]);
        });
    }
});
