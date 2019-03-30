import { Activator, DynamicObject } from './activator';

class TypedClass {
    value: string;
}

describe('Activator', () => {
    let activator: Activator;

    beforeEach(() => {
        activator = new Activator();
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
