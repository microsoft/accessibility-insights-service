// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable: no-unsafe-any no-any no-require-imports no-var-requires no-submodule-imports
import Apify from 'apify';
import { cloneDeep, isEmpty, isNil } from 'lodash';
import * as nodeUrl from 'url';
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

    private readonly sameOriginRequests: {
        [key: string]: number;
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

        // skip requests that has exceeded same-origin threshold
        if (this.exceededSameOriginRequestFrequency(newRequest.url)) {
            return {
                request: newRequest,
                requestId: newRequest.uniqueKey as string,
                wasAlreadyPresent: true,
                wasAlreadyHandled: true,
            };
        }

        // count original requests only
        if (isEmpty(newRequest.userData)) {
            this.countRequestOrigin(newRequest.url);
        }

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

    private exceededSameOriginRequestFrequency(url: string): boolean {
        const maximumSameOriginRequestsThreshold = 25;
        const urlNormalized = this.normalizeUrl(url);
        const origin = this.getUrlOrigin(urlNormalized);

        return this.sameOriginRequests[origin] > maximumSameOriginRequestsThreshold;
    }

    private countRequestOrigin(url: string): void {
        const urlNormalized = this.normalizeUrl(url);
        if (!this.hasMinimumSegments(urlNormalized)) {
            return;
        }

        const origin = this.getUrlOrigin(urlNormalized);
        if (this.sameOriginRequests[origin] === undefined) {
            this.sameOriginRequests[origin] = 1;
        } else {
            this.sameOriginRequests[origin] += 1;
        }
    }

    private hasMinimumSegments(url: string): boolean {
        const minimumSegmentsToCount = 3;
        const urlParsed = nodeUrl.parse(url);
        const segments = urlParsed.pathname.split('/').filter((s) => !isEmpty(s));

        return segments.length >= minimumSegmentsToCount;
    }

    private getUrlOrigin(url: string): string {
        return url.substring(0, url.lastIndexOf('/'));
    }

    private normalizeUrl(url: string): string {
        const urlParsed = nodeUrl.parse(url);

        return url.replace(urlParsed.hash, '').replace(urlParsed.search, '').toLocaleLowerCase();
    }
}
