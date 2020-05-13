// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable: no-unsafe-any no-any no-require-imports no-var-requires no-submodule-imports
import Apify from 'apify';
import { cloneDeep, isNil } from 'lodash';
import { RequestQueueBase } from './request-queue-base';
import * as utilities from './utilities';

const apifyUtilities = require('apify-shared/utilities');

class CustomRequest extends Apify.Request {
    public dequeued: boolean = false;
}

export class RequestQueueMemory extends RequestQueueBase {
    private requests: {
        [key: string]: CustomRequest;
    } = {};

    constructor() {
        super(apifyUtilities.cryptoRandomObjectId(), 'inMemoryQueue');
    }

    public async addRequest(
        request: Apify.Request | Apify.RequestOptions,
        options?: {
            forefront?: boolean;
        },
    ): Promise<Apify.QueueOperationInfo> {
        const newRequest = request instanceof Apify.Request ? request : new Apify.Request(request);
        newRequest.id = utilities.generateHash(newRequest.uniqueKey);

        if (isNil(this.requests[newRequest.uniqueKey])) {
            // tslint:disable-next-line: no-object-literal-type-assertion
            this.requests[newRequest.uniqueKey] = new CustomRequest(newRequest);

            return {
                request: cloneDeep(this.requests[newRequest.uniqueKey]),
                requestId: newRequest.uniqueKey as string,
                wasAlreadyPresent: false,
                wasAlreadyHandled: false,
            };
        }

        return {
            request: cloneDeep(this.requests[newRequest.uniqueKey]),
            requestId: newRequest.uniqueKey as string,
            wasAlreadyPresent: true,
            wasAlreadyHandled: !isNil(this.requests[newRequest.uniqueKey].handledAt),
        };
    }

    public async getRequest(requestId: string): Promise<Apify.Request | null> {
        return cloneDeep(this.requests[requestId]);
    }

    public async fetchNextRequest(): Promise<Apify.Request> {
        const request = await this.getFirstRequestToDequeue();
        if (!isNil(request)) {
            request.dequeued = true;
        }

        return cloneDeep(request);
    }

    public async markRequestHandled(request: Apify.Request): Promise<Apify.QueueOperationInfo> {
        const savedRequest = this.requests[request.uniqueKey];
        let alreadyHandled = false;
        if (!isNil(savedRequest)) {
            if (!isNil(savedRequest.handledAt)) {
                alreadyHandled = true;
            } else {
                savedRequest.handledAt = new Date();
            }
        }

        return {
            request: cloneDeep(savedRequest),
            requestId: request.id as string,
            wasAlreadyHandled: alreadyHandled,
            wasAlreadyPresent: !isNil(savedRequest),
        };
    }

    public async reclaimRequest(
        request: Apify.Request,
        options?: {
            forefront?: boolean;
        },
    ): Promise<Apify.QueueOperationInfo> {
        const savedRequest = this.requests[request.uniqueKey];
        let alreadyHandled = false;
        if (!isNil(savedRequest) && isNil(savedRequest.handledAt)) {
            savedRequest.dequeued = false;
            savedRequest.retryCount = request.retryCount;
        } else {
            alreadyHandled = true;
        }

        return {
            request: cloneDeep(savedRequest),
            requestId: request.id as string,
            wasAlreadyHandled: alreadyHandled,
            wasAlreadyPresent: !isNil(savedRequest),
        };
    }

    public async isEmpty(): Promise<boolean> {
        const request = await this.getFirstRequestToDequeue();

        return isNil(request);
    }

    public async isFinished(): Promise<boolean> {
        for (const key of Object.keys(this.requests)) {
            if (isNil(this.requests[key].handledAt)) {
                return false;
            }
        }

        return true;
    }

    public async drop(): Promise<void> {
        this.requests = {};
    }

    public async handledCount(): Promise<number> {
        let handledCount = 0;
        for (const key of Object.keys(this.requests)) {
            if (!isNil(this.requests[key].handledAt)) {
                handledCount += 1;
            }
        }

        return handledCount;
    }

    private async getFirstRequestToDequeue(): Promise<CustomRequest> {
        for (const key of Object.keys(this.requests)) {
            if (!this.requests[key].dequeued && isNil(this.requests[key].handledAt)) {
                return this.requests[key];
            }
        }

        return undefined;
    }
}
