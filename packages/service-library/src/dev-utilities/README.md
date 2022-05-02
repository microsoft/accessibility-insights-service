<!--
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT License.
-->

## Submit privacy scan to AI Service

-   Open terminal window
-   Login in to Azure with Azure CLI:

```bash
az login
```

-   Switch to subscription where AI Service is deployed:

```bash
az account set --subscription <subscription id>
```

-   Run [create-env-file-for-debug.sh](https://github.com/microsoft/accessibility-insights-service/blob/main/packages/resource-deployment/scripts/create-env-file-for-debug.sh) script to create SP account. Provide resource group name where AI Service is deployed. Use script out to fulfill `AI_OAUTH_*` script parameters below.

```bash
./create-env-file-for-debug.sh -r <resource group name>
```

-   Create `url.txt` file with list of URLs to scan in data folder
-   Create `.env` file in [service-library](https://github.com/microsoft/accessibility-insights-service/tree/main/packages/service-library) package folder. The `.env` file example:

```ini
AI_SERVICE_BASE_URL=
OPERATION=submit-scan
DATA_FOLDER=../../data
SCAN_FILE=/urls.txt
HASHBYURL=true

AI_OAUTH_CLIENT_ID=
AI_OAUTH_CLIENT_SECRET=
AI_OAUTH_RESOURCE_ID=
```

-   Build `service-library` package:

```bash
yarn build
```

-   Run [service-client.ts](https://github.com/microsoft/accessibility-insights-service/blob/main/packages/service-library/src/dev-utilities/service-client.ts) script:

```bash
node ./dist/service-client.js
```

> Note: The script will create a new run request for each URL provided. Ensure that data from previous script run is stored separately to simplify future data processing.

## Get privacy scan result from AI Service

-   Update key in `.env` file to:

```ini
OPERATION=get-result
```

-   Run the [service-client.ts](https://github.com/microsoft/accessibility-insights-service/blob/main/packages/service-library/src/dev-utilities/service-client.ts) script:

```bash
node ./dist/service-client.js
```

## Export WCP privacy validation result

-   Run the below SQL query against WCP SQL database and export query result as `.json`. Save exported result in `privacy-data.json` file.

```SQL
SELECT Site.ID, Site.Name, R.StartedDate, R.ValidationResultBlobName FROM [dbo].[Site]
INNER JOIN
(
	SELECT WebSecValidationResult.* FROM
	(SELECT SiteId, MAX(StartedDate) AS StartedDate FROM [dbo].[WebSecValidationResult] GROUP BY SiteId) AS G
	INNER JOIN [dbo].[WebSecValidationResult] ON G.StartedDate = WebSecValidationResult.StartedDate
) AS R
ON Site.ID = R.SiteId
WHERE R.StartedDate > '2022-03-01'
```

-   Update `.env` file by adding the following keys:

```ini
OPERATION=get-validation
PRIVACY_METADATA_FILE=privacy-data.json
WCP_AZURE_STORAGE_NAME=
WCP_AZURE_STORAGE_KEY=
WCP_AZURE_BLOB_CONTAINER_NAME=
```

-   Run the [wcp-data-parser.ts](https://github.com/microsoft/accessibility-insights-service/blob/main/packages/service-library/src/dev-utilities/wcp-data-parser.ts) script:

```bash
node ./dist/wcp-data-parser.ts
```

> Note: The script will download privacy scan result to `DATA_FOLDER` location.

## Compare results

-   Update key in `.env` file:

```ini
OPERATION=compare-validation
```

-   Run the [wcp-data-parser.ts](https://github.com/microsoft/accessibility-insights-service/blob/main/packages/service-library/src/dev-utilities/wcp-data-parser.ts) script:

```bash
node ./dist/wcp-data-parser.ts
```
