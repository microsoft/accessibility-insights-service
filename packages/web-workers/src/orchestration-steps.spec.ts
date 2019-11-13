// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable-next-line:no-submodule-imports
import { DurableOrchestrationContext, IOrchestrationFunctionContext } from 'durable-functions/lib/src/classes';
import { IMock, Mock } from 'typemoq';
import { OrchestrationStepsImpl } from './orchestration-steps';

describe(OrchestrationStepsImpl, () => {
    let context: IOrchestrationFunctionContext;
    let orchestrationContext: IMock<DurableOrchestrationContext>;

    beforeEach(() => {
        orchestrationContext = Mock.ofType<DurableOrchestrationContext>();

        context = <IOrchestrationFunctionContext>(<unknown>{
            bindingDefinitions: {},
            executionContext: {
                functionName: 'function-name',
                invocationId: 'id',
            },
            bindingData: {
                logger: undefined,
            },
            df: orchestrationContext.object,
        });
    });
});
