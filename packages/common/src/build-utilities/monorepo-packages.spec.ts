// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { listMonorepoPackageNames } from './monorepo-packages';

describe('listMonorepoPackageNames', () => {
    it('returns the pinned set of package names', () => {
        expect(listMonorepoPackageNames()).toMatchInlineSnapshot(`
            Array [
              "axe-result-converter",
              "azure-services",
              "accessibility-insights-scan",
              "common",
              "accessibility-insights-crawler",
              "functional-tests",
              "health-client",
              "logger",
              "resource-deployment",
              "scanner-global-library",
              "service-library",
              "storage-documents",
              "web-api",
              "web-api-client",
              "web-api-scan-job-manager",
              "web-api-scan-request-sender",
              "web-api-scan-runner",
              "web-api-send-notification-job-manager",
              "web-api-send-notification-runner",
              "web-workers",
            ]
        `);
    });
});
