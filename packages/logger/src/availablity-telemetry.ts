// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export type AvailabilityTelemetry = {
    id?: string;
    duration?: number;
    success: boolean;
    runLocation?: string;
    message?: string;
    // tslint:disable-next-line: no-any
    measurements?: { [key: string]: number };
    // tslint:disable-next-line: no-any
    properties?: { [key: string]: string };
};
