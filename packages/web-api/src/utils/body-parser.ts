import * as RawBody from 'raw-body';
import { Readable } from 'stream';

export class BodyParser {
    public async getRawBody(stream: Readable, options?: RawBody.Options): Promise<Buffer> {
        return RawBody(stream, options);
    }
}
