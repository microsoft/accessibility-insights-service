// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export type EventsQueryOptions = {
    timespan?: string;
    $filter?: string;
    $search?: string;
    $orderby?: string;
    $select?: string;
    $skip?: string;
    $top?: string;
    $format?: string;
    $count?: string;
    $apply?: string;
};
