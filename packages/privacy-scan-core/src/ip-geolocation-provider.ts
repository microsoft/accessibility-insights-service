// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { isEmpty } from 'lodash';
import { injectable } from 'inversify';

interface IpGeolocationXml {
    ip: string;
    country_name: string;
    region_name: string;
    city: string;
    is_in_european_union: boolean;
}

export interface IpGeolocation {
    ip: string;
    countryName: string;
    regionName: string;
    city: string;
    isInEuropeanUnion: boolean;
}

@injectable()
export class IpGeolocationProvider {
    public getIpGeolocation(): IpGeolocation {
        if (isEmpty(process.env.IP_GEOLOCATION)) {
            return {} as IpGeolocation;
        }

        const ipGeolocation = JSON.parse(process.env.IP_GEOLOCATION) as IpGeolocationXml;

        return {
            ip: this.fixIpAddress(ipGeolocation.ip),
            countryName: ipGeolocation.country_name,
            regionName: ipGeolocation.region_name,
            city: ipGeolocation.city,
            isInEuropeanUnion: ipGeolocation.is_in_european_union,
        };
    }

    private fixIpAddress(ip: string): string {
        const fixedIp = `${ip.substring(0, ip.lastIndexOf('.'))}.0`;

        return fixedIp;
    }
}
