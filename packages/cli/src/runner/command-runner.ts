// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ScanArguments } from '../types/scan-arguments';

export interface CommandRunner {
    runCommand(scanArguments: ScanArguments): Promise<void>;
}
