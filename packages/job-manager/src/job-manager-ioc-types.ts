import { ServiceClient } from 'azure-batch';

export const jobManagerIocTypeNames = {
    BatchServiceClientProvider: 'BatchServiceClientProvider',
};

export type BatchServiceClientProvider = () => Promise<ServiceClient.BatchServiceClient>;
