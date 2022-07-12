// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IpGeolocationProvider } from './ip-geolocation-provider';

let ipGeolocationProvider: IpGeolocationProvider;

describe(IpGeolocationProvider, () => {
    beforeEach(() => {
        ipGeolocationProvider = new IpGeolocationProvider();
        process.env.IP_GEOLOCATION = `{"ip":"1.1.1.1","country_name":"United States","region_name":"Washington","city":"Redmond","is_in_european_union":true}`;
    });

    it('should return ip geolocation', () => {
        const expectedIpGeolocation = {
            city: 'Redmond',
            countryName: 'United States',
            ip: '1.1.1.0',
            isInEuropeanUnion: true,
            regionName: 'Washington',
        };
        const ipGeolocation = ipGeolocationProvider.getIpGeolocation();

        expect(ipGeolocation).toEqual(expectedIpGeolocation);
    });

    it('should return empty ip geolocation', () => {
        process.env.IP_GEOLOCATION = '';
        const ipGeolocation = ipGeolocationProvider.getIpGeolocation();

        expect(ipGeolocation).toEqual({});
    });
});
