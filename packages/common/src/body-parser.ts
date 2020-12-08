// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Readable } from 'stream';
import getRawBody from 'raw-body';
import { injectable } from 'inversify';

@injectable()
export class BodyParser {
    public async getRawBody(stream: Readable, options?: getRawBody.Options): Promise<Buffer> {
        return getRawBody(stream, options);
    }
}
