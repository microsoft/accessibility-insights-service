// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

type Column = {
    name: string;
    // tslint:disable-next-line:no-reserved-keywords
    type: string;
};

type Row = string[];

type Table = {
    name: string;
    columns: Column[];
    rows: Row[];
};

export type ApplicationInsightsQueryResponse = {
    tables: Table[];
};
