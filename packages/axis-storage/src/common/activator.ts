import { injectable } from 'inversify';

// tslint:disable: no-any no-object-literal-type-assertion prefer-object-spread
export class DynamicObject {
    [key: string]: any;
}

@injectable()
export class Activator {
    public convert<T>(source: any, typeT?: new () => T): T {
        if (typeT === undefined) {
            const target = this.createInstance(DynamicObject);

            return <T>Object.assign(target, source);
        } else {
            const target = this.createInstance(typeT);

            return <T>Object.assign(target, source);
        }
    }

    public createInstance<T>(typeT: new () => T): T {
        return new typeT();
    }
}
