// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { BatchServiceModels } from '@azure/batch';

export interface BatchTaskParameterProvider {
    // tslint:disable-next-line: no-any
    getTaskParameter(taskId: string, ...args: any[]): Promise<BatchServiceModels.TaskAddParameter>;
}
