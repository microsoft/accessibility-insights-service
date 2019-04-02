// tslint:disable: no-any
export interface CosmosOperationResponse<T> {
    item?: T;
    response?: any;
    statusCode: number;
}
