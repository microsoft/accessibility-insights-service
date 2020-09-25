// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as inversify from 'inversify';
import { ContextAwareLogger, registerLoggerToContainer } from 'logger';
import { setupRequestContextIocContainer } from './setup-request-context-ioc-container';

@inversify.injectable()
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class TestAutoInjectable {}

describe(setupRequestContextIocContainer, () => {
    let parentContainer: inversify.Container;
    let testSubject: inversify.Container;

    beforeEach(() => {
        parentContainer = new inversify.Container();
        parentContainer.bind('parentBind1').toConstantValue('parentBind1Instance');

        testSubject = setupRequestContextIocContainer(parentContainer);
    });

    it('verifies dependencies resolution', () => {
        expect(testSubject.get(TestAutoInjectable)).toBeInstanceOf(TestAutoInjectable);
        expect(testSubject.get('parentBind1')).toBe('parentBind1Instance');
    });

    describe('Logger resolution', () => {
        it('throws error if global logger not setup', () => {
            expect(() => testSubject.get(ContextAwareLogger)).toThrowError();
        });

        it('resolves context aware logger', () => {
            registerLoggerToContainer(parentContainer);

            expect(testSubject.get(ContextAwareLogger)).toBeDefined();
        });
    });
});
