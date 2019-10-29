export type AvailabilityTelemetry = {
    id: string;
    duration?: string;
    success?: boolean;
    runLocation?: string;
    message?: string;
    // tslint:disable-next-line: no-any
    measurements?: any;
    // tslint:disable-next-line: no-any
    properties?: any;
};
