// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';

@injectable()
export class BrowserSettings {
    public browserStartupArguments = ['--disable-dev-shm-usage'];
}
