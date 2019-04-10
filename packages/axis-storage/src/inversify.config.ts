// tslint:disable: no-import-side-effect
import 'reflect-metadata';

import * as inversify from 'inversify';
import { autoProvide, buildProviderModule } from 'inversify-binding-decorators';
import * as types from './types';

const container = new inversify.Container();
autoProvide(container, types);
container.load(buildProviderModule());
export { container };
