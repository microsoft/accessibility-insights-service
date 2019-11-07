// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as inversify from 'inversify';
import { setupRequestContextIocContainer } from './setup-request-context-ioc-container';

@inversify.injectable()
// tslint:disable-next-line: no-unnecessary-class
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
        // tslint:disable-next-line: no-backbone-get-set-outside-model
        expect(testSubject.get('parentBind1')).toBe('parentBind1Instance');
    });
});
