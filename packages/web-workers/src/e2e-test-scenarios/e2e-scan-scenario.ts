// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { SerializableResponse } from 'common';
// eslint-disable-next-line import/no-internal-modules
import { Task, TaskSet } from 'durable-functions/lib/src/classes';
import { E2EScanScenarioDefinition } from './e2e-scan-scenario-definitions';

export interface E2EScanScenario {
    readonly testDefinition: E2EScanScenarioDefinition;
    submitScanPhase(): Generator<Task | TaskSet, void, SerializableResponse & void>;
    waitForScanCompletionPhase(): Generator<Task | TaskSet, void, SerializableResponse & void>;
    afterScanCompletedPhase(): Generator<Task | TaskSet, void, SerializableResponse & void>;
}
