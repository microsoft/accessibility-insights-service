// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Activator, DynamicObject } from './activator';

// tslint:disable: no-any

class TypedClass {
    public value: string;
}

describe('Activator', () => {
    let activator: Activator;

    beforeEach(() => {
        activator = new Activator();
    });

    it('convert to string type', () => {
        const source: string = 'value';

        const instance = activator.convert<string>(source);

        expect(instance).toBeDefined();
        expect(instance).toEqual('value');
    });

    it('convert to array type', () => {
        const source: any[] = [{ p1: 'value' }];

        const instance = activator.convert<string>(source);

        expect(instance).toBeDefined();
        expect(instance).toEqual([{ p1: 'value' }]);
    });

    it('convert to new dynamic instance', () => {
        const source = {
            value: 'value',
            name: 'name',
        };

        const instance = activator.convert<TypedClass>(source);

        expect(instance).toBeDefined();
        expect(instance).toBeInstanceOf(DynamicObject);
        expect(instance.value).toEqual('value');
    });

    it('convert to new typed instance', () => {
        const source = {
            value: 'value',
            name: 'name',
        };

        const instance = activator.convert<TypedClass>(source, TypedClass);

        expect(instance).toBeDefined();
        expect(instance).toBeInstanceOf(TypedClass);
        expect(instance.value).toEqual('value');
    });

    it('create typed instance', () => {
        const instance = activator.createInstance<TypedClass>(TypedClass);

        expect(instance).toBeDefined();
        expect(instance).toBeInstanceOf(TypedClass);
    });
});
