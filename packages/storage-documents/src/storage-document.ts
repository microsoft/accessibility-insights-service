// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
export interface StorageDocument {
    /** Required.
     * Unique name that identifies the item, that is, no two items share the same ID within a database.
     * The id must not exceed 255 characters.
     */
    id: string;

    /** Required.
     * Name that identifies the item type.
     */
    itemType: string;

    /**
     * Partition key used to store the document.
     */
    partitionKey: string;

    /**
     * The storage document type version.
     */
    itemVersion?: string;

    /** System generated property.
     * The resource ID (_rid) is a unique identifier that is also hierarchical per the resource stack on the resource model.
     * It is used internally for placement and navigation of the item resource.
     */
    _rid?: string;

    /** System generated property.
     * Specifies the last updated timestamp of the resource. The value is a timestamp.
     */
    _ts?: number;

    /** System generated property.
     * he unique addressable URI for the resource.
     */
    _self?: string;

    /** System generated property.
     * Represents the resource etag required for optimistic concurrency control.
     */
    _etag?: string;
}
