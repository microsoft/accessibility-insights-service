import { Hash } from 'crypto';

export class HashIdGenerator {
    public constructor(private readonly sha256: Hash) {}

    public generateHashId(url: string, fullyQualifiedLogicalName: string, snippet: string, ruleId: string): string {
        const properties: string[] = [url, fullyQualifiedLogicalName, snippet, ruleId];
        const hashSeed: string = properties.join('|').toLowerCase();

        return this.sha256.update(hashSeed).digest('hex');
    }
}
