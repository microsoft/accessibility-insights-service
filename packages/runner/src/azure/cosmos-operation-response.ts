export interface CosmosOperationResponse<T> {
    item?: T;
    response?: any;
    statusCode: number;
}
