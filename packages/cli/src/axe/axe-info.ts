// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as Axe from 'axe-core';
import { inject, injectable, optional } from 'inversify';

@injectable()
export class AxeInfo {
    constructor(@optional() @inject('Axe') private readonly axe: typeof Axe = Axe) {}

    public get version(): string {
        return this.axe.version;
    }
}
