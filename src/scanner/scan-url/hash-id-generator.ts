import * as shaJs from 'sha.js';

export class HashIdGenerator {
    public constructor(private readonly shajs: typeof shaJs) {}

    public generateHashId(url: string, fullyQualifiedLogicalName: string, snippet: string, ruleId: string): string {
        const properties: string[] = [url, fullyQualifiedLogicalName, snippet, ruleId];
        const hashSeed: string = properties.join('|').toLowerCase();

        return this.shajs('sha256')
            .update(hashSeed)
            .digest('hex');
    }
}
