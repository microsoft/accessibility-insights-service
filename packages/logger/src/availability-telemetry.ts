// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export type AvailabilityTelemetry = {
    id?: string;
    duration?: number;
    success: boolean;
    runLocation?: string;
    message?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    measurements?: { [key: string]: number };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    properties?: { [key: string]: string };
};
