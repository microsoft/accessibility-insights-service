// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';
import { ServiceConfiguration } from './configuration/service-configuration';
import { GuidGenerator } from './system/guid-generator';

export function setupRuntimeConfigContainer(container: Container): void {
    container.bind<ServiceConfiguration>(ServiceConfiguration).toSelf().inSingletonScope();

    container.bind<GuidGenerator>(GuidGenerator).toSelf().inSingletonScope();
}
