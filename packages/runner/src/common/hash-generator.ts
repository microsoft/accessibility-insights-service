import * as sha256 from 'sha.js';

export class HashGenerator {
    public constructor(private readonly sha: typeof sha256 = sha256) {}

    public generateBase64Hash(...values: string[]): string {
        const hashSeed: string = values.join('|').toLowerCase();

        return this.sha('sha256')
            .update(hashSeed)
            .digest('hex');
    }
}
