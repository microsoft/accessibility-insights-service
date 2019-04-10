// tslint:disable:no-any no-empty no-unsafe-any no-import-side-effect
import '../node';

import { IMock } from 'typemoq';

export function getPromisableDynamicMock<T>(mock: IMock<T>): IMock<T> {
    // workaround for issue https://github.com/florinn/typemoq/issues/70
    mock.setup((x: any) => x.then).returns(() => undefined);

    return mock;
}
