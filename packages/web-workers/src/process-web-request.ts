// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AppContext, getGlobalWebControllerDispatcher, Newable, WebController } from 'service-library';
import { Container } from 'inversify';
import * as appInsights from 'applicationinsights';
import { isEmpty } from 'lodash';
import { getProcessLifeCycleContainer } from './get-process-life-cycle-container';

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function processWebRequest(appContext: AppContext, controllerType: Newable<WebController>, ...args: any[]): Promise<any> {
    const processLifeCycleContainer = getProcessLifeCycleContainer();
    const dispatcher = await getGlobalWebControllerDispatcher(processLifeCycleContainer);

    const container = new Container({ autoBindInjectable: true });
    container.parent = processLifeCycleContainer;

    let correlationContext;
    if (appContext.request) {
        const headers: { [key: string]: string } = {};
        if (appContext.request.headers) {
            appContext.request.headers.forEach((value, key) => {
                headers[key] = value;
            });
        }
        correlationContext = appInsights.startOperation(appContext.context, {
            ...appContext.request,
            headers: isEmpty(headers) ? undefined : headers,
        });

        return appInsights.wrapWithCorrelationContext<Promise<any>>(
            dispatcher.processRequest(container, controllerType, appContext, ...args),
            correlationContext,
        );
    } else {
        return dispatcher.processRequest(container, controllerType, appContext, ...args);
    }
}
