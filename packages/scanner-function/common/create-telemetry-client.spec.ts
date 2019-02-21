import { Context } from '@azure/functions';
import * as appInsights from 'applicationinsights';
import { IMock, It, Mock, Times } from 'typemoq';

import { createTelemetryClient } from './create-telemetry-client';

// tslint:disable:no-object-literal-type-assertion no-any no-unsafe-any
describe('createTelemetryClient', () => {
    let appInsightsMock: IMock<typeof appInsights>;
    let defaultClientMock: IMock<appInsights.TelemetryClient>;
    let contextStub: Context;
    const imageVersion = 'sample image version';

    beforeEach(() => {
        appInsightsMock = Mock.ofType<typeof appInsights>();
        defaultClientMock = Mock.ofType<appInsights.TelemetryClient>();
        (global as any).__IMAGE_VERSION__ = imageVersion;

        contextStub = {
            executionContext: { invocationId: 'inv id', functionName: 'fnc name', functionDirectory: 'func directory' },
        } as Context;

        appInsightsMock.setup(a => a.defaultClient).returns(() => defaultClientMock.object);
    });

    it('should start with common properties', () => {
        defaultClientMock
            .setup(
                d =>
                    (d.commonProperties = It.isValue({
                        imageVersion: imageVersion,
                        ...contextStub.executionContext,
                    })),
            )
            .verifiable(Times.once());

        defaultClientMock.setup(d => d.trackEvent({ name: 'FunctionStarted' })).verifiable(Times.once());

        const client = createTelemetryClient(contextStub, appInsightsMock.object);

        appInsightsMock.verify(a => a.setup(), Times.once());
        appInsightsMock.verify(a => a.start(), Times.once());
        defaultClientMock.verifyAll();

        expect(client).toBe(defaultClientMock.object);
    });
});
