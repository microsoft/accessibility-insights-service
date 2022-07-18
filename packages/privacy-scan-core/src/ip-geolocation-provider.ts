// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { isEmpty } from 'lodash';
import { injectable } from 'inversify';

export interface IpGeolocation {
    ip: string;
    region: string;
}

@injectable()
export class IpGeolocationProvider {
    public getIpGeolocation(): IpGeolocation {
        if (isEmpty(process.env.IP_GEOLOCATION)) {
            return undefined;
        }

        const ipGeolocation = JSON.parse(process.env.IP_GEOLOCATION) as IpGeolocation;

        return {
            ip: this.fixIpAddress(ipGeolocation.ip),
            region: ipGeolocation.region,
        };
    }

    private fixIpAddress(ip: string): string {
        const fixedIp = `${ip.substring(0, ip.lastIndexOf('.'))}.0`;

        return fixedIp;
    }
}
