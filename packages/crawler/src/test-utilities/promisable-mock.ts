// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { IMock } from 'typemoq';

export function getPromisableDynamicMock<T>(mock: IMock<T>): IMock<T> {
    // workaround for issue https://github.com/florinn/typemoq/issues/70

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mock.setup((x: any) => x.then).returns(() => undefined);

    return mock;
}
