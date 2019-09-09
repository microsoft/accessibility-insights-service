// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';
import { ServiceConfiguration } from './configuration/service-configuration';
import { GuidUtils } from './system/guid-utils';

export function setupRuntimeConfigContainer(container: Container): void {
    container
        .bind<ServiceConfiguration>(ServiceConfiguration)
        .toSelf()
        .inSingletonScope();

    container
        .bind<GuidUtils>(GuidUtils)
        .toSelf()
        .inSingletonScope();
}
