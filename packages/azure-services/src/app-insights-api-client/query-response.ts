// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export type Column = {
    name: string;
    type: string;
};

export type Row = string[];

export type Table = {
    name: string;
    columns: Column[];
    rows: Row[];
};

export type ApplicationInsightsQueryResponse = {
    tables: Table[];
};
