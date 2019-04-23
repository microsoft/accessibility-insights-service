import 'reflect-metadata';

import { registerAxisStorageToContainer } from 'axis-storage';
import * as inversify from 'inversify';

export function setupJobManagerContainer(): inversify.Container {
    const container = new inversify.Container();
    registerAxisStorageToContainer(container);

    return container;
}
