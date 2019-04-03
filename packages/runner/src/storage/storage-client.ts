// tslint:disable: no-any
import { inject } from 'inversify';
import { VError } from 'verror';
import { CosmosClientWrapper } from '../azure/cosmos-client-wrapper';
import { CosmosOperationResponse } from '../azure/cosmos-operation-response';
import { RetryOptions } from './retry-options';

export class StorageClient {
    constructor(
        @inject(CosmosClientWrapper) private readonly cosmosClientWrapper: CosmosClientWrapper,
        private readonly dbName = 'scanner',
        private readonly collectionName = 'a11yIssues',
    ) {}

    public async readDocument<T>(documentId: string): Promise<CosmosOperationResponse<T>> {
        return this.cosmosClientWrapper.readItem<T>(documentId, this.dbName, this.collectionName);
    }

    public async writeDocument<T>(document: T): Promise<CosmosOperationResponse<T>> {
        return this.cosmosClientWrapper.upsertItem<T>(document, this.dbName, this.collectionName);
    }

    public async writeDocuments<T>(documents: T[]): Promise<void> {
        await this.cosmosClientWrapper.upsertItems<T>(documents, this.dbName, this.collectionName);
    }

    public async tryExecuteOperation<T>(
        operation: (...args: any[]) => Promise<CosmosOperationResponse<T>>,
        retryOptions: RetryOptions = {
            timeoutMilliseconds: 15000,
            intervalMilliseconds: 500,
            retryingOnStatusCodes: [412 /* PreconditionFailed */],
        },
        ...args: any[]
    ): Promise<CosmosOperationResponse<T>> {
        return new Promise(async (resolve, reject) => {
            const transientStatusCodes = [
                429 /* TooManyRequests */,
                449 /* RetryWith */,
                500 /* InternalServerError */,
                503 /* ServiceUnavailable */,
                ...retryOptions.retryingOnStatusCodes,
            ];
            const timeoutTimestamp = Date.now() + retryOptions.timeoutMilliseconds;
            // tslint:disable-next-line: no-constant-condition
            while (true) {
                try {
                    const operationResponse = await operation(...args);

                    if (operationResponse.statusCode <= 399 || transientStatusCodes.indexOf(operationResponse.statusCode) < 0) {
                        cout(`[storage-client] Operation completed. Response status code ${operationResponse.statusCode}.`);
                        resolve(operationResponse);

                        break;
                    } else if (Date.now() > timeoutTimestamp) {
                        cout(`[storage-client] Operation has timed out after ${retryOptions.timeoutMilliseconds} ms.`);
                        reject(operationResponse);

                        break;
                    } else {
                        cout(
                            `[storage-client] Retrying operation in ${retryOptions.intervalMilliseconds} ms... Response status code ${
                                operationResponse.statusCode
                            }.`,
                        );
                    }
                } catch (error) {
                    reject(new VError(cause(error), 'An error occurred while executing storage operation.'));

                    break;
                }

                // tslint:disable-next-line: no-string-based-set-timeout
                await new Promise(r => setTimeout(r, retryOptions.intervalMilliseconds));
            }
        });
    }
}
