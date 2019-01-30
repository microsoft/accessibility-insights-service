import { IMock } from 'typemoq';

export function getPromisableDynamicMock<T>(mock: IMock<T>): IMock<T> {
    // workaround for issue https://github.com/florinn/typemoq/issues/70

    // tslint:disable-next-line:no-any no-unsafe-any
    mock.setup((x: any) => x.then).returns(() => undefined);

    return mock;
}
