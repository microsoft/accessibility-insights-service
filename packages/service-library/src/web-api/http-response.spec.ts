// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { HttpResponse } from './http-response';
import { WebApiErrorCodes } from './web-api-error-codes';

describe(HttpResponse, () => {
    it('create HTTP error response from web API code', () => {
        const webApiCode = WebApiErrorCodes.invalidResourceId;
        const response = HttpResponse.getErrorResponse(webApiCode);
        expect(response.status).toEqual(webApiCode.statusCode);
        expect(response.body).toEqual(webApiCode.response);
    });
});
