// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';
import { ApifySettings, setApifyEnvVars } from './apify-settings';

describe('Apify settings', () => {
    it('gets default settings', () => {
        const expectedSettings: ApifySettings = {
            APIFY_HEADLESS: '1',
        };

        setApifyEnvVars();

        Object.keys(expectedSettings).forEach((key: keyof ApifySettings) => {
            expect(process.env[`${key}`]).toBe(expectedSettings[key]);
        });
    });

    it('merges default settings', () => {
        const settings: ApifySettings = {
            APIFY_LOCAL_STORAGE_DIR: 'local storage dir',
        };
        const expectedSettings: ApifySettings = {
            ...settings,
            APIFY_HEADLESS: '1',
        };

        setApifyEnvVars(settings);

        Object.keys(expectedSettings).forEach((key: keyof ApifySettings) => {
            expect(process.env[`${key}`]).toBe(expectedSettings[key]);
        });
    });

    it('overrides default settings', () => {
        const overrideSettings: ApifySettings = {
            APIFY_HEADLESS: '0',
            APIFY_LOCAL_STORAGE_DIR: 'local storage dir',
        };

        setApifyEnvVars(overrideSettings);

        Object.keys(overrideSettings).forEach((key: keyof ApifySettings) => {
            expect(process.env[`${key}`]).toBe(overrideSettings[key]);
        });
    });

    it('does not override setting if undefined', () => {
        const settings: ApifySettings = {
            APIFY_LOCAL_STORAGE_DIR: undefined,
        };

        const presetLocalStorageDir = 'local storage dir';
        process.env.APIFY_LOCAL_STORAGE_DIR = presetLocalStorageDir;

        setApifyEnvVars(settings);

        expect(process.env.APIFY_LOCAL_STORAGE_DIR).toBe(presetLocalStorageDir);
    });
});
