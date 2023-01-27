// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { isEmpty } from 'lodash';

export interface ServicePrincipal {
    name: string;
    password: string;
}

@injectable()
export class ServicePrincipalProvider {
    constructor(private readonly defaultServicePrincipal: ServicePrincipal = undefined) {
        if (isEmpty(defaultServicePrincipal)) {
            this.defaultServicePrincipal = {
                name: process.env.SERVICE_PRINCIPAL_NAME,
                password: process.env.SERVICE_PRINCIPAL_PASSWORD,
            };
        }

        // set service principal properties to an empty string to trigger login page input validation
        this.defaultServicePrincipal.name = this.defaultServicePrincipal.name ?? '';
        this.defaultServicePrincipal.password = this.defaultServicePrincipal.password ?? '';
    }

    public getDefaultServicePrincipal(): ServicePrincipal {
        return this.defaultServicePrincipal;
    }
}
