// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';

// tslint:disable: no-any no-object-literal-type-assertion prefer-object-spread
export class DynamicObject {
    [key: string]: any;
}

@injectable()
export class Activator {
    public convert<T>(source: any, typeT?: new () => T): T {
        if (typeof source === 'string' || source instanceof String) {
            return <T>(<any>source);
        }

        if (source instanceof Array) {
            return <T>(<any>source);
        }

        const target = typeT === undefined ? this.createInstance(DynamicObject) : this.createInstance(typeT);

        return <T>Object.assign(target, source);
    }

    public createInstance<T>(typeT: new () => T): T {
        return new typeT();
    }
}
