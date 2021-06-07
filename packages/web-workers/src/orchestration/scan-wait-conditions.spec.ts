// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { ScanRunResultResponse } from 'service-library';
import { ScanWaitConditions } from './scan-wait-conditions';

describe('ScanWaitConditions', () => {
    describe('base scan wait conditions', () => {
        it.each`
            scanResultState | expectedResult
            ${'pass'}       | ${true}
            ${'fail'}       | ${true}
            ${'pending'}    | ${false}
        `('isSucceded evaluates to $expectedResult when scanResult.state=$scanResultState', ({ scanResultState, expectedResult }) => {
            const scanRunResponse = {
                scanResult: {
                    state: scanResultState,
                },
            } as ScanRunResultResponse;

            expect(ScanWaitConditions.baseScan.isSucceeded(scanRunResponse)).toBe(expectedResult);
        });

        it.each`
            runState       | expectedResult
            ${'pending'}   | ${false}
            ${'accepted'}  | ${false}
            ${'queued'}    | ${false}
            ${'running'}   | ${false}
            ${'completed'} | ${false}
            ${'failed'}    | ${true}
        `('isFailed evaluates to $expectedResult when run.state=$runState', ({ runState, expectedResult }) => {
            const scanRunResponse = {
                run: {
                    state: runState,
                },
            } as ScanRunResultResponse;

            expect(ScanWaitConditions.baseScan.isFailed(scanRunResponse)).toBe(expectedResult);
        });

        it('handles undefined scanResult and run', () => {
            const scanRunResponse = {} as ScanRunResultResponse;

            expect(ScanWaitConditions.baseScan.isSucceeded(scanRunResponse)).toBe(false);
            expect(ScanWaitConditions.baseScan.isFailed(scanRunResponse)).toBe(false);
        });
    });

    describe('scan notification wait conditions', () => {
        it.each`
            notificationState | expectedResult
            ${'pending'}      | ${false}
            ${'queued'}       | ${false}
            ${'queueFailed'}  | ${false}
            ${'sending'}      | ${false}
            ${'sent'}         | ${true}
            ${'sendFailed'}   | ${true}
        `('isSucceded evaluates to $expectedResult when notification.state=$notificationState', ({ notificationState, expectedResult }) => {
            const scanRunResponse = {
                notification: {
                    state: notificationState,
                },
            } as ScanRunResultResponse;

            expect(ScanWaitConditions.scanNotification.isSucceeded(scanRunResponse)).toBe(expectedResult);
        });

        it.each`
            notificationState | expectedResult
            ${'pending'}      | ${false}
            ${'queued'}       | ${false}
            ${'queueFailed'}  | ${true}
            ${'sending'}      | ${false}
            ${'sent'}         | ${false}
            ${'sendFailed'}   | ${false}
        `('isFailed evaluates to $expectedResult when notification.state=$notificationState', ({ notificationState, expectedResult }) => {
            const scanRunResponse = {
                notification: {
                    state: notificationState,
                },
            } as ScanRunResultResponse;

            expect(ScanWaitConditions.scanNotification.isFailed(scanRunResponse)).toBe(expectedResult);
        });

        it('Handles missing notification field', () => {
            const scanRunResponse = {} as ScanRunResultResponse;

            expect(ScanWaitConditions.scanNotification.isSucceeded(scanRunResponse)).toBe(false);
            expect(ScanWaitConditions.scanNotification.isFailed(scanRunResponse)).toBe(false);
        });
    });

    describe('deep scan wait conditions', () => {
        it.each`
            runState       | expectedResult
            ${'pending'}   | ${false}
            ${'accepted'}  | ${false}
            ${'queued'}    | ${false}
            ${'running'}   | ${false}
            ${'completed'} | ${true}
            ${'failed'}    | ${false}
        `('isSucceeds evaluates to $expectedResult when run.state=$runState', ({ runState, expectedResult }) => {
            const scanRunResponse = {
                run: {
                    state: runState,
                },
            } as ScanRunResultResponse;

            expect(ScanWaitConditions.deepScan.isSucceeded(scanRunResponse)).toBe(expectedResult);
        });

        it.each`
            runState       | expectedResult
            ${'pending'}   | ${false}
            ${'accepted'}  | ${false}
            ${'queued'}    | ${false}
            ${'running'}   | ${false}
            ${'completed'} | ${false}
            ${'failed'}    | ${true}
        `('isFailed evaluates to $expectedResult when run.state=$runState', ({ runState, expectedResult }) => {
            const scanRunResponse = {
                run: {
                    state: runState,
                },
            } as ScanRunResultResponse;

            expect(ScanWaitConditions.deepScan.isFailed(scanRunResponse)).toBe(expectedResult);
        });

        it('Handles missing run field', () => {
            const scanRunResponse = {} as ScanRunResultResponse;

            expect(ScanWaitConditions.deepScan.isSucceeded(scanRunResponse)).toBe(false);
            expect(ScanWaitConditions.deepScan.isFailed(scanRunResponse)).toBe(false);
        });
    });
});
