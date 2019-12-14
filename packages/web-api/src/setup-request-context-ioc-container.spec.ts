// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as inversify from 'inversify';
import { Logger } from 'logger';
import { setupRequestContextIocContainer } from './setup-request-context-ioc-container';
import { MockableLogger } from './test-utilities/mockable-logger';

@inversify.injectable()
// tslint:disable-next-line: no-unnecessary-class
class TestAutoInjectable {}

describe(setupRequestContextIocContainer, () => {
    let parentContainer: inversify.Container;
    let testSubject: inversify.Container;

    const registerLoggerToContainerStub = (container: inversify.Container): void => {
        const loggerObj = new MockableLogger([], undefined);

        container.bind(Logger).toConstantValue(loggerObj);
    };

    beforeEach(() => {
        parentContainer = new inversify.Container();
        parentContainer.bind('parentBind1').toConstantValue('parentBind1Instance');
        registerLoggerToContainerStub(parentContainer);

        testSubject = setupRequestContextIocContainer(parentContainer, registerLoggerToContainerStub);
    });

    it('verifies dependencies resolution', () => {
        expect(testSubject.get(TestAutoInjectable)).toBeInstanceOf(TestAutoInjectable);
        // tslint:disable-next-line: no-backbone-get-set-outside-model
        expect(testSubject.get('parentBind1')).toBe('parentBind1Instance');
    });

    it('registers new logger', () => {
        expect(parentContainer.get(Logger)).not.toBe(testSubject.get(Logger));
    });
});
