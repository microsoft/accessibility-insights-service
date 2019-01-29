# Accessibility Insights for Service

## Building the code

### 1. Clone the repository

-   Clone the repository using one of the following commands
    ```bash
    git clone https://github.com/Microsoft/accessibility-insights-service.git
    ```
-   Select the created directory
    ```bash
    cd accessibility-insights-web
    ```

### 2. Install packages

-   Install the packages
    ```bash
    npm install
    ```

### 3. Build & deploy from vscode

-   Go to a azure function project (eg, scanner) & open a file, say index.ts
-   Press F5. This build the project & deploys azure function locally.
-   Perform trigger operation to trigger an azure function. For eg, create a message in scan-url-queue azure queue to trigger scan-url function

### 4. Build & deploy from command line

-   Build project
    ```bash
       npm run build
    ```
-   From each local.settings.template.json, create local.settings.json in the same directory & get the secrets from azure portal.
-   copy local.settings.json to dist folder
    ```bash
       npm run copy-local-settings
    ```
-   Deploy locally (goto the function folder you want to deploy. in this case, scanner function project is used)
    ```bash
       cd dist/scanner
       func extensions install
       func host start
    ```
-   Perform trigger operations for the corresponding azure function. For eg, create a message in scan-url-queue azure queue to trigger scan-url function

## Testing

### 1. From command line

-   Run unit tests
    ```bash
       npm test
    ```
