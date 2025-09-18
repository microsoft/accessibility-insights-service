#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -n <NSP name> [-p <profile name>] [-l <location>] -i <resource id to associate> [-a <association name>] [-m <association mode>]
"
    exit 1
}

# Default template paths
nspTemplateFilePath="${0%/*}/../templates/azuredeploy-nsp.json"
transitionTemplateFilePath="${0%/*}/../templates/nsp-transitionMode.json"

# Default values
profileName="defaultProfile"
associationMode="Learning"

# Read script arguments
while getopts ":r:n:p:l:i:a:m:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    n) networkSecurityPerimeterName=${OPTARG} ;;
    p) profileName=${OPTARG} ;;
    l) nspLocation=${OPTARG} ;;
    i) passResourceId=${OPTARG} ;;
    a) resourceAssociationName=${OPTARG} ;;
    m) associationMode=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $networkSecurityPerimeterName ]] || [[ -z $passResourceId ]]; then
    exitWithUsageInfo
fi

# Deploy NSP and profile
az deployment group create \
    --resource-group "$resourceGroupName" \
    --template-file "$nspTemplateFilePath" \
    --parameters networkSecurityPerimeterName="$networkSecurityPerimeterName" profileName="$profileName" ${nspLocation:+nspLocation="$nspLocation"}

# Deploy resource association with transition mode
az deployment group create \
    --resource-group "$resourceGroupName" \
    --template-file "$transitionTemplateFilePath" \
    --parameters networkSecurityPerimeterName="$networkSecurityPerimeterName" profileName="$profileName" passResourceId="$passResourceId" ${resourceAssociationName:+resourceAssociationName="$resourceAssociationName"} associationMode="$associationMode"

echo "NSP and transition mode deployment completed."