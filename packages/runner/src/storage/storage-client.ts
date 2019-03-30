import { inject } from 'inversify';
import { CosmosClientWrapper } from '../azure/cosmos-client-wrapper';
import { CosmosOperationResponse } from '../azure/cosmos-operation-response';
import { VError } from 'verror';

export class StorageClient {
    constructor(
        @inject(CosmosClientWrapper) private readonly cosmosClientWrapper: CosmosClientWrapper,
        private readonly dbName = 'scanner',
        private readonly collectionName = 'a11yIssues',
    ) {}

    public async readDocument<T>(documentId: string): Promise<CosmosOperationResponse<T>> {
        return await this.cosmosClientWrapper.readItem<T>(documentId, this.dbName, this.collectionName);
    }

    public async writeDocument<T>(document: T): Promise<CosmosOperationResponse<T>> {
        return await this.cosmosClientWrapper.upsertItem<T>(document, this.dbName, this.collectionName);
    }

    public async writeDocuments<T>(documents: T[]): Promise<void> {
        await this.cosmosClientWrapper.upsertItems<T>(documents, this.dbName, this.collectionName);
    }

    public async tryExecuteOperation<T>(
        operation: (...args: any[]) => Promise<CosmosOperationResponse<T>>,
        timeoutMilliseconds: number = 15000,
        intervalMilliseconds: number = 500,
        ...args: any[]
    ): Promise<CosmosOperationResponse<T>> {
        return new Promise(async (resolve, reject) => {
            const timeoutTimestamp = Date.now() + timeoutMilliseconds;
            while (true) {
                try {
                    const operationResponse = await operation(...args);

                    if (operationResponse.statusCode <= 399 || operationResponse.statusCode !== 412 /* PreconditionFailed */) {
                        cout(`[storage-client] Operation completed. Response status code ${operationResponse.statusCode}.`);
                        resolve(operationResponse);

                        break;
                    } else if (Date.now() > timeoutTimestamp) {
                        cout(`[storage-client] Operation has timed out after ${timeoutMilliseconds} ms.`);
                        reject(operationResponse);

                        break;
                    } else {
                        cout(
                            `[storage-client] Retrying operation in ${intervalMilliseconds} ms... Response status code ${
                                operationResponse.statusCode
                            }.`,
                        );
                    }
                } catch (error) {
                    reject(new VError(error, 'An error occurred while executing storage operation.'));

                    break;
                }

                await new Promise(r => setTimeout(r, intervalMilliseconds));
            }
        });
    }
}
