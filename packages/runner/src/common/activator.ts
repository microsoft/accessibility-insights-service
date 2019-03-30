export class DynamicObject {
    [key: string]: any;
}

export class Activator {
    public convert<T>(source: any, type?: { new (): T }): T {
        if (type === undefined) {
            const target = this.createInstance(DynamicObject);

            return <T>Object.assign(target, source);
        } else {
            const target = this.createInstance(type);

            return <T>Object.assign(target, source);
        }
    }

    public createInstance<T>(type: { new (): T }): T {
        return new type();
    }
}
