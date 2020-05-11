// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as Apify from 'apify';

// tslint:disable: no-var-requires no-submodule-imports no-require-imports no-unsafe-any
const apifyUtilities = require('apify-shared/utilities');

/**
 * Represents Apify {@link RequestQueue} minimal set of required APIs.
 */
export abstract class RequestQueueBase {
    /**
     * @param string queueId
     * @param string [queueName]
     * @param string [clientKey]
     */
    constructor(
        protected readonly queueId: string,
        protected readonly queueName: string,
        protected readonly clientKey: string = apifyUtilities.cryptoRandomObjectId(),
    ) {}

    /**
     * Adds a request to the queue.
     *
     * If a request with the same `uniqueKey` property is already present in the queue,
     * it will not be updated. You can find out whether this happened from the resulting
     * {@link QueueOperationInfo} object.
     *
     * To add multiple requests to the queue by extracting links from a webpage,
     * see the {@link utils#enqueueLinks} helper function.
     *
     * @param (Request|RequestOptions) request @link Request object or vanilla object with request data.
     * Note that the function sets the `uniqueKey` and `id` fields to the passed object.
     * @param Object [options]
     * @param boolean [options.forefront=false] If `true`, the request will be added to the foremost position in the queue.
     * @return Promise<QueueOperationInfo>
     */
    public abstract async addRequest(
        request: Apify.Request | Apify.RequestOptions,
        options?:
            | {
                  forefront?: boolean;
              }
            | undefined,
    ): Promise<Apify.QueueOperationInfo>;

    /**
     * Gets the request from the queue specified by ID.
     *
     * @param string requestId ID of the request.
     * @return Promise<(Request | null)> Returns the request object, or `null` if it was not found.
     */
    public abstract async getRequest(requestId: string): Promise<Apify.Request | null>;

    /**
     * Returns a next request in the queue to be processed, or `null` if there are no more pending requests.
     *
     * Once you successfully finish processing of the request, you need to call
     * {@link RequestQueue#markRequestHandled}
     * to mark the request as handled in the queue. If there was some error in processing the request,
     * call {@link RequestQueue#reclaimRequest} instead,
     * so that the queue will give the request to some other consumer in another call to the `fetchNextRequest` function.
     *
     * Note that the `null` return value doesn't mean the queue processing finished,
     * it means there are currently no pending requests.
     * To check whether all requests in queue were finished,
     * use {@link RequestQueue#isFinished} instead.
     *
     * @returns Promise<(Request|null)>
     * Returns the request object or `null` if there are no more pending requests.
     */
    public abstract async fetchNextRequest(): Promise<Apify.Request | null>;

    /**
     * Marks a request that was previously returned by the
     * {@link RequestQueue#fetchNextRequest}
     * function as handled after successful processing.
     * Handled requests will never again be returned by the `fetchNextRequest` function.
     *
     * @param Request request
     * @return Promise<QueueOperationInfo>
     */
    public abstract async markRequestHandled(request: Apify.Request): Promise<Apify.QueueOperationInfo>;

    /**
     * Reclaims a failed request back to the queue, so that it can be returned for processed later again
     * by another call to {@link RequestQueue#fetchNextRequest}.
     * The request record in the queue is updated using the provided `request` parameter.
     * For example, this lets you store the number of retries or error messages for the request.
     *
     * @param Request request
     * @param Object [options]
     * @param boolean [options.forefront=false]
     * If `true` then the request it placed to the beginning of the queue, so that it's returned
     * in the next call to {@link RequestQueue#fetchNextRequest}.
     * By default, it's put to the end of the queue.
     * @return Promise<QueueOperationInfo>
     */
    public abstract async reclaimRequest(
        request: Apify.Request,
        options?:
            | {
                  forefront?: boolean;
              }
            | undefined,
    ): Promise<Apify.QueueOperationInfo>;

    /**
     * Resolves to `true` if the next call to {@link RequestQueue#fetchNextRequest}
     * would return `null`, otherwise it resolves to `false`.
     * Note that even if the queue is empty, there might be some pending requests currently being processed.
     * If you need to ensure that there is no activity in the queue, use {@link RequestQueue#isFinished}.
     *
     * @returns Promise<boolean>
     */
    public abstract async isEmpty(): Promise<boolean>;

    /**
     * Resolves to `true` if all requests were already handled and there are no more left.
     * Due to the nature of distributed storage used by the queue,
     * the function might occasionally return a false negative,
     * but it will never return a false positive.
     *
     * @returns Promise<boolean>
     */
    public abstract async isFinished(): Promise<boolean>;

    /**
     * Removes the queue either from the Apify Cloud storage or from the local directory,
     * depending on the mode of operation.
     *
     * @return Promise<void>
     */
    public abstract async drop(): Promise<void>;

    /**
     * Returns the number of handled requests.
     *
     * This function is just a convenient shortcut for:
     *
     * ```javascript
     * const { handledRequestCount } = await queue.getInfo();
     * ```
     *
     * @return Promise<number>
     */
    public abstract async handledCount(): Promise<number>;
}
