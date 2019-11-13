// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { isNil } from 'lodash';

export class GeneratorExecutor {
    private prevCall: IteratorResult<unknown, unknown>;

    constructor(private readonly generatorFunc: IterableIterator<unknown>) {}

    public next(): IteratorResult<unknown, unknown> {
        // tslint:disable-next-line:no-any
        const currentCall = this.generatorFunc.next(isNil(this.prevCall) ? undefined : (this.prevCall.value as any));

        this.prevCall = currentCall;

        return currentCall;
    }
}
