// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import {
    AggregationTemporality,
    MeterProvider,
    MetricReader,
    PeriodicExportingMetricReader,
    PushMetricExporter,
} from '@opentelemetry/sdk-metrics';
import * as opentelemetry from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { LoggerClient } from './logger-client';
import { BaseTelemetryProperties } from './base-telemetry-properties';
import { LoggerEvent } from './logger-event';
import { TelemetryMeasurements } from './logger-event-measurements';
import { AvailabilityTelemetry } from './availability-telemetry';
import { LoggerProperties } from './logger-properties';
import { LogLevel } from './logger';
import { OTelConfigProvider } from './otel-config-provider';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class OTelLoggerClient implements LoggerClient {
    public initialized = false;

    private enabled = false;

    private baseProperties: BaseTelemetryProperties;

    private meterProvider: MeterProvider;

    private metricReader: MetricReader;

    private exporter: PushMetricExporter;

    constructor(
        @inject(OTelConfigProvider) private readonly otelConfigProvider: OTelConfigProvider,
        private readonly resource: Resource = Resource.default(),
    ) {}

    public async setup(baseProperties?: BaseTelemetryProperties): Promise<void> {
        this.baseProperties = baseProperties;
        await this.setupOTel();
        this.initialized = true;
    }

    public trackMetric(name: string, value: number): void {
        return;
    }

    public trackEvent(name: LoggerEvent, properties?: { [name: string]: string }, measurements?: TelemetryMeasurements[LoggerEvent]): void {
        if (this.enabled !== true) {
            return;
        }

        const meter = opentelemetry.metrics.getMeter(name);
        Object.keys(measurements).map((key) => {
            const counterName = `${name}.${key}`;
            const counter = meter.createCounter(counterName, {
                description: counterName,
                valueType: opentelemetry.ValueType.INT,
            });
            counter.add(measurements[key], this.getProperties(properties));
        });
    }

    public trackAvailability(name: string, telemetry: AvailabilityTelemetry): void {
        return;
    }

    public trackException(error: Error): void {
        return;
    }

    public log(message: string, logLevel: LogLevel, properties?: { [name: string]: string }): void {
        return;
    }

    public async flush(): Promise<void> {
        if (this.enabled !== true) {
            return;
        }

        await this.meterProvider.forceFlush();
        await this.exporter.forceFlush();
    }

    public setCommonProperties(properties: LoggerProperties): void {
        this.baseProperties = { ...this.baseProperties, ...properties };
    }

    private getProperties(properties: Record<string, any>): Record<string, any> {
        return { ...this.baseProperties, ...properties };
    }

    private async setupOTel(): Promise<void> {
        // TODO use config
        const config = await this.otelConfigProvider.getConfig();
        this.enabled = config.supported;

        if (this.enabled !== true) {
            return;
        }

        this.resource.merge(
            new Resource({
                [SemanticResourceAttributes.SERVICE_NAME]: 'WebInsightsService',
            }),
        );

        this.exporter = new OTLPMetricExporter({
            url: config.otelListenerUrl,
            temporalityPreference: AggregationTemporality.DELTA,
        });

        this.metricReader = new PeriodicExportingMetricReader({
            exporter: this.exporter,
            exportIntervalMillis: 5000,
        });

        this.meterProvider = new MeterProvider({
            resource: this.resource,
        });

        this.meterProvider.addMetricReader(this.metricReader);

        opentelemetry.metrics.setGlobalMeterProvider(this.meterProvider);
    }
}
