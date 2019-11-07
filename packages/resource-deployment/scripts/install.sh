#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

export appInsightsKey
export apiManagementName
export batchAccountName
export cosmosAccountName
export datalakeStorageAccountName
export dropFolder="${0%/*}/../../../"
export environment
export functionAppName
export keyVault
export keyVaultUrl
export location
export resourceGroupName
export subscription
export storageAccountName
export clientId
export templatesFolder="${0%/*}/../templates/"
export apiTemplates="$templatesFolder"rest-api-templates
export vnetResource

exitWithUsageInfo() {
    echo "
Usage: $0 -e <environment> -l <Azure region> -o <organisation name> -p <publisher email> -r <resource group> -s <subscription name or id> -c <client id>
where:
Resource group - The name of the resource group that everything will be deployed in.
Subscription - The subscription for the resource group.
Environment - The environment in which the set up is running.
Publisher email - The email for notifications.
Resource group - The resource group that this API instance needs to be added to.
Client ID - the app registration client id used for function app authentication/ authorization.
Azure region - Azure region where the instances will be deployed. Available Azure regions:
    centralus
    eastasia
    southeastasia
    eastus
    eastus2
    westus
    westus2
    northcentralus
    southcentralus
    westcentralus
    northeurope
    westeurope
    japaneast
    japanwest
    brazilsouth
    australiasoutheast
    australiaeast
    westindia
    southindia
    centralindia
    canadacentral
    canadaeast
    uksouth
    ukwest
    koreacentral
    koreasouth
    francecentral
    southafricanorth
    uaenorth
"
    exit 1
}

# Read script arguments
while getopts ":r:s:l:e:o:p:c:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    s) subscription=${OPTARG} ;;
    l) location=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    o) orgName=${OPTARG} ;;
    p) publisherEmail=${OPTARG} ;;
    c) clientId=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $subscription ]] || [[ -z $environment ]] || [[ -z $orgName ]] || [[ -z $publisherEmail ]]; then
    exitWithUsageInfo
fi

# Login to Azure if required
if ! az account show 1>/dev/null; then
    az login
fi

az account set --subscription "$subscription"

. "${0%/*}/create-resource-group.sh"

. "${0%/*}/create-storage-account.sh"

# . "${0%/*}/create-datalake-storage-account.sh"

. "${0%/*}/upload-files.sh"

. "${0%/*}/create-queues.sh"

. "${0%/*}/setup-cosmos-db.sh"

. "${0%/*}/app-insights-create.sh"

. "${0%/*}/create-vnet.sh"

. "${0%/*}/batch-account-create.sh"

. "${0%/*}/push-secrets-to-key-vault.sh"

. "${0%/*}/function-app-create.sh"

. "${0%/*}/job-schedule-create.sh"

. "${0%/*}/create-api-management.sh"

. "${0%/*}/deploy-rest-api.sh"

. "${0%/*}/create-dashboard.sh"
