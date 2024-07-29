// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { WebHttpResponse } from './web-http-response';
import { WebApiErrorCodes } from './web-api-error-codes';

describe(WebHttpResponse, () => {
    it('create HTTP error response from web API code', () => {
        const webApiCode = WebApiErrorCodes.invalidResourceId;
        const response = WebHttpResponse.getErrorResponse(webApiCode);
        expect(response.status).toEqual(webApiCode.statusCode);
        expect(response.jsonBody.error).toEqual(webApiCode.error);
    });
});
