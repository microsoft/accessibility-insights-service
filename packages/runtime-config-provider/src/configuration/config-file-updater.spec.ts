// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { AsyncInterval } from 'common';
import * as fs from 'fs';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { BlobReader } from '../blob-reader';
import { ConfigFileUpdater } from './config-file-updater';

// tslint:disable: no-any no-unsafe-any

describe(ConfigFileUpdater, () => {
    let testSubject: ConfigFileUpdater;
    let asyncIntervalMock: IMock<AsyncInterval>;
    let blobReaderMock: IMock<BlobReader>;
    let fsMock: IMock<typeof fs>;
    const fileContent = 'file content';
    let intervalCallback: () => Promise<boolean>;
    // tslint:disable-next-line:variable-name
    let RealDate: typeof Date;
    let currentDate: Date;

    beforeEach(() => {
        RealDate = global.Date;
        (global.Date as any) = jest.fn((...props) => (props.length > 0 ? new (RealDate as any)(...props) : currentDate));

        currentDate = new RealDate(2019, 1, 1);

        asyncIntervalMock = Mock.ofType(AsyncInterval, MockBehavior.Strict);
        // tslint:disable-next-line:no-empty
        blobReaderMock = Mock.ofType(BlobReader, MockBehavior.Strict, false, () => {});
        fsMock = Mock.ofInstance(fs);

        testSubject = new ConfigFileUpdater(blobReaderMock.object, asyncIntervalMock.object, fsMock.object);
    });

    afterEach(() => {
        global.Date = RealDate;
    });

    describe('initialize', () => {
        it('does not initialize more than once', async () => {
            setupVerifiableGetBlobContentCall();
            setupVerifiableFileWriteCall();
            setupVerifiableIntervalExecutionCall();

            await testSubject.initialize();
            await testSubject.initialize();

            verifyAll();
        });

        it('should throw if file write fails', async () => {
            setupVerifiableGetBlobContentCall();
            setupVerifiableFailedFileWriteCall();

            await expect(testSubject.initialize()).rejects.toBeDefined();

            verifyAll();
        });
    });

    describe('notifySubscribers', () => {
        beforeEach(async () => {
            setupVerifiableGetBlobContentCall();
            setupVerifiableFileWriteCall();
            setupVerifiableIntervalExecutionCall();

            await testSubject.initialize();
            resetMocks();
        });

        it('notifies subscribers when blob updated', async () => {
            let callbackInvoked = false;
            const callback = async () => {
                callbackInvoked = true;
            };
            testSubject.subscribe(callback);
            setupVerifiableGetBlobContentCall();
            setupVerifiableFileWriteCall();

            await intervalCallback();

            expect(callbackInvoked).toBe(true);
        });

        it('does not notify subscribers when blob not updated', async () => {
            let callbackInvoked = false;
            const callback = async () => {
                callbackInvoked = true;
            };
            testSubject.subscribe(callback);

            setupVerifiableUnmodifiedGetBlobContentCall();
            await intervalCallback();
            expect(callbackInvoked).toBe(false);
        });
    });

    describe('last modified time', () => {
        it('verifies modified time is updated on every call', async () => {
            const fetchContentTimes: Date[] = [];
            const expectedStartTime = new RealDate(1, 1, 2019);
            const secondCallTime = new RealDate(2, 2, 2019);
            const thirdCallTime = new RealDate(5, 2, 2019);

            currentDate = secondCallTime;
            blobReaderMock
                .setup(b => b.getModifiedBlobContent('runtime-configuration', 'runtime-config.json', It.isAny()))
                .returns(async (container, blob, time) => {
                    fetchContentTimes.push(time);

                    return Promise.resolve({ notFound: false, isModified: true, updatedContent: fileContent });
                });
            setupVerifiableFileWriteCall();
            setupVerifiableIntervalExecutionCall();

            await testSubject.initialize();

            expect(fetchContentTimes[0]).toEqual(expectedStartTime);

            currentDate = thirdCallTime;
            await intervalCallback();
            await intervalCallback();

            expect(fetchContentTimes[1]).toEqual(secondCallTime);
            expect(fetchContentTimes[2]).toEqual(thirdCallTime);
        });
    });

    function setupVerifiableGetBlobContentCall(): void {
        blobReaderMock
            .setup(b => b.getModifiedBlobContent('runtime-configuration', 'runtime-config.json', It.isAny()))
            .returns(() => Promise.resolve({ notFound: false, isModified: true, updatedContent: fileContent }));
    }

    function setupVerifiableUnmodifiedGetBlobContentCall(): void {
        blobReaderMock
            .setup(b => b.getModifiedBlobContent('runtime-configuration', 'runtime-config.json', It.isAny()))
            .returns(() => Promise.resolve({ notFound: false, isModified: false, updatedContent: undefined }));
    }

    function setupVerifiableFileWriteCall(): void {
        fsMock
            .setup(f => f.writeFile(ConfigFileUpdater.filePath, fileContent, It.isAny()))
            .callback((filePath, content, callback) => {
                callback();
            })
            .verifiable(Times.once());
    }

    function setupVerifiableFailedFileWriteCall(): void {
        fsMock
            .setup(f => f.writeFile(ConfigFileUpdater.filePath, fileContent, It.isAny()))
            .callback((filePath, content, callback) => {
                callback(new Error('file write failure message'));
            })
            .verifiable(Times.once());
    }

    function setupVerifiableIntervalExecutionCall(): void {
        asyncIntervalMock
            .setup(a => a.setIntervalExecution(It.isAny(), ConfigFileUpdater.updateCheckIntervalInMilliSec))
            .returns(callback => {
                intervalCallback = callback;
            })
            .verifiable(Times.once());
    }

    function verifyAll(): void {
        blobReaderMock.verifyAll();
        fsMock.verifyAll();
        asyncIntervalMock.verifyAll();
    }

    function resetMocks(): void {
        blobReaderMock.reset();
        fsMock.reset();
        asyncIntervalMock.reset();
    }
});
