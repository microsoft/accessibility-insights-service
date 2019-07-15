// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as fs from 'fs';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import * as defaultConfig from './runtime-config/runtime-config.dev.json';
import { ServiceConfiguration } from './service-configuration';

// tslint:disable: non-literal-fs-path no-unsafe-any no-any

describe(ServiceConfiguration, () => {
    let testSubject: ServiceConfiguration;
    let fsMock: IMock<typeof fs>;

    beforeEach(() => {
        fsMock = Mock.ofInstance(fs, MockBehavior.Strict);
        testSubject = new ServiceConfiguration(fsMock.object);
    });

    it('verifies dev config path', async () => {
        const buffer = fs.readFileSync(ServiceConfiguration.devProfilePath);

        const actualConfig = JSON.parse(buffer.toString('utf-8'));

        expect(actualConfig).toEqual(defaultConfig);
    });

    it('should return dev config as default config', async () => {
        setupVerifiableFileExistsCall(ServiceConfiguration.profilePath, false);
        setupVerifiableFileExistsCall(ServiceConfiguration.devProfilePath, true);

        setupVerifiableFileReadCall(ServiceConfiguration.devProfilePath, cb => {
            cb(undefined, new Buffer(JSON.stringify(defaultConfig)));
        });

        const config = await testSubject.getConfig();

        expect(config).toEqual(defaultConfig);

        fsMock.verifyAll();
    });

    it('returns profile config', async () => {
        setupVerifiableFileExistsCall(ServiceConfiguration.profilePath, true);
        const expectedConfig = { foo: 'bar' };

        setupVerifiableFileReadCall(ServiceConfiguration.profilePath, cb => {
            cb(undefined, new Buffer(JSON.stringify(expectedConfig)));
        });

        const config = await testSubject.getConfig();

        expect(config).toEqual(expectedConfig);

        fsMock.verifyAll();
    });

    it('throw if file not parsable', async () => {
        setupVerifiableFileExistsCall(ServiceConfiguration.profilePath, true);
        const fileContent = 'content not json parsable';

        setupVerifiableFileReadCall(ServiceConfiguration.profilePath, cb => {
            cb(undefined, new Buffer(fileContent));
        });

        await expect(testSubject.getConfig()).rejects.toBeDefined();

        fsMock.verifyAll();
    });

    it('throw if file reading fails', async () => {
        setupVerifiableFileExistsCall(ServiceConfiguration.profilePath, true);
        const expectedConfig = { foo: 'bar' };
        const errorMessage = 'some error occurred while reading';

        setupVerifiableFileReadCall(ServiceConfiguration.profilePath, cb => {
            cb(errorMessage as any, new Buffer(JSON.stringify(expectedConfig)));
        });

        await expect(testSubject.getConfig()).rejects.toBe(errorMessage);

        fsMock.verifyAll();
    });

    function setupVerifiableFileReadCall(
        profilePath: string,
        callback: (prodCodeReadCallback: (err: Error, buffer: Buffer) => void) => void,
    ): void {
        fsMock
            .setup(f => f.readFile(profilePath, It.isAny()))
            .callback((filePath: string, cb: (err: Error, buffer: Buffer) => void) => {
                callback(cb);
            })
            .verifiable(Times.once());
    }
    function setupVerifiableFileExistsCall(profilePath: string, fileExistsValue: boolean): void {
        fsMock
            .setup(f => f.exists(profilePath, It.isAny()))
            .callback((filePath: string, cb: (exists: boolean) => void) => {
                cb(fileExistsValue);
            })
            .verifiable(Times.once());
    }
});
