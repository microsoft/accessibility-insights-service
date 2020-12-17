// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export class HashSet<T> implements IterableIterator<T> {
    constructor(private readonly hashDictionary: { [key: string]: T } = {}) {}

    private pointer = 0;
    private keysSnapshot: string[];

    public add(key: string, value: T): void {
        this.hashDictionary[key] = value;
    }

    public get(key: string): T {
        return this.hashDictionary[key];
    }

    public remove(key: string): void {
        // eslint-disable-next-line @typescript-eslint/tslint/config
        delete this.hashDictionary[key];
    }

    public has(key: string): boolean {
        return this.hashDictionary[key] !== undefined;
    }

    public keys(): string[] {
        return Object.keys(this.hashDictionary);
    }

    public values(): T[] {
        return Array.from(this);
    }

    public next(): IteratorResult<T> {
        if (this.keysSnapshot === undefined) {
            this.getSnapshot();
        }

        if (this.pointer < this.keysSnapshot.length) {
            return {
                done: false,
                value: this.get(this.keysSnapshot[this.pointer++]),
            };
        } else {
            this.keysSnapshot = undefined;

            return {
                done: true,
                value: undefined,
            };
        }
    }

    public toJSON(): { [key: string]: T } {
        return this.hashDictionary;
    }

    public [Symbol.iterator](): IterableIterator<T> {
        return this;
    }

    private getSnapshot(): void {
        this.pointer = 0;
        this.keysSnapshot = this.keys();
    }
}
