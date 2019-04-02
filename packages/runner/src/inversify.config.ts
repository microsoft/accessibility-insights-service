// tslint:disable: no-import-side-effect
import 'reflect-metadata';

import * as inversify from 'inversify';
import { autoProvide, buildProviderModule } from 'inversify-binding-decorators';
import { Browser } from 'puppeteer';
import * as types from './types';
import { WebDriver } from './web-driver/web-driver';

const container = new inversify.Container();
autoProvide(container, types);
container.load(buildProviderModule());

container.bind<WebDriver>(WebDriver).toConstantValue(new WebDriver());

container.bind<inversify.interfaces.Factory<Browser>>('Factory<Browser>').toFactory<Browser>(context => {
    return () => {
        return context.container.get<WebDriver>(WebDriver).browser;
    };
});

export { container };
