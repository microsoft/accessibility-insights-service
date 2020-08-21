// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import getRawBody from 'raw-body';
import { Readable } from 'stream';

export class BodyParser {
    public async getRawBody(stream: Readable, options?: getRawBody.Options): Promise<Buffer> {
        return getRawBody(stream, options);
    }
}
