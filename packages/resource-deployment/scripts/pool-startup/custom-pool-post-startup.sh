#!/bin/bash

# shellcheck disable=SC1091,SC1090

set -eo pipefail

export AZ_BATCH_ACCOUNT_NAME
export AZ_BATCH_POOL_ID
export AZ_BATCH_NODE_ID

export azSecPackContainerRegistry="linuxgeneva-microsoft.azurecr.io"
export azSecPackImageName="genevasecpackinstall:master_57"

exitWithUsageInfo() {
    echo "
Usage: $0 -k <keyvault> -s <subscription name or id>
"
    exit 1
}

getSecretValue() {
    local key=$1
    declare -n refResult=$2
    local secretValue

    secretValue=$(az keyvault secret show --name "$key" --vault-name "$KEY_VAULT_NAME" --query "value" -o tsv)

    if [[ -z $secretValue ]]; then
        echo "Unable to get secret for $key"
        exit 1
    fi

    # shellcheck disable=SC2034  # Reference variable
    refResult=$secretValue
}

loginToAzure() {
    if ! az login --identity 1>/dev/null; then
        echo "Unable to login using managed identity. Using Dev mode."
        if [[ -z $subscription ]]; then
            exitWithUsageInfo
        fi

        if ! az account show 1>/dev/null; then
            az login
        fi
        az account set --subscription "$subscription"
        isDevMode=true
    else
        isDevMode=false
    fi
}

getContextInfo() {
    echo "Setting context information"

    if [[ $isDevMode == true ]]; then
        azSecPackTenant="dev"
        azSecPackRole="local"
        azSecPackRoleInstance="local"
    else
        azSecPackTenant=$AZ_BATCH_ACCOUNT_NAME
        azSecPackRole=$AZ_BATCH_POOL_ID
        azSecPackRoleInstance=$AZ_BATCH_NODE_ID
    fi

    echo "Successfully set context information:
            azSecPackRole: $azSecPackTenant
            azSecPackRole: $azSecPackRole
            azSecPackRoleInstance: $azSecPackRoleInstance
        "
}

fetchSecretsFromKeyVault() {
    echo "Fetching certificate from key vault..."

    getSecretValue "azSecPackRegistryAccessSpAppId" azSecPackRegistryAccessSpAppId
    getSecretValue "azSecPackRegistryAccessSpPassword" azSecPackRegistryAccessSpPassword

    echo "Removing old certificate from $pfxPath"
    rm -f "$pfxPath"

    local thumbprint=$(az keyvault certificate show --name azSecPackCert --query "x509ThumbprintHex" -o tsv --vault-name "$KEY_VAULT_NAME")
    echo "Downloading the certificate $thumbprint from key vault..."
    az keyvault secret download --file "$pfxPath" --encoding base64 --name azSecPackCert --vault-name "$KEY_VAULT_NAME"

    echo "Successfully fetched certificate from key vault"
}

runAzSecPack() {
    echo "Logging into the container registry - $azSecPackContainerRegistry"
    echo "$azSecPackRegistryAccessSpPassword" | docker login "$azSecPackContainerRegistry" --username "$azSecPackRegistryAccessSpAppId" --password-stdin

    local azSecPackGcsPfx="/secret/$pfxFileName"
    local azSecPackImagePath="$azSecPackContainerRegistry/$azSecPackImageName"

    echo "starting azure security pack container with config:
    secretsDirPath - $secretsDirPath
    AzSecPack_GCS_PFX - $azSecPackGcsPfx
    AzSecPack_GCS_Environment - $azSecPackGcsEnvironment
    AzSecPack_GCS_Account - $azSecPackGcsAccount
    AzSecPack_GCS_Config_Version - $azSecPackGcsConfigVersion
    AzSecPack_EventVersion - $azSecPackEventVersion
    AzSecPack_Timestamp - $azSecPackTimestamp
    AzSecPack_Namespace - $azSecPackNamespace
    AzSecPack_Moniker - $azSecPackMoniker
    AzSecPack_Tenant - $azSecPackTenant
    AzSecPack_Role - $azSecPackRole
    AzSecPack_RoleInstance - $azSecPackRoleInstance
    AzSecPack_MachineName - $azSecPackRoleInstance
    image - $azSecPackImagePath
"
    # shellcheck disable=SC2140
    docker run --rm \
        -v /:/host \
        -v "$secretsDirPath":"/secret" \
        -e AzSecPack_GCS_PFX="$azSecPackGcsPfx" \
        -e AzSecPack_GCS_Environment="$azSecPackGcsEnvironment" \
        -e AzSecPack_GCS_Account="$azSecPackGcsAccount" \
        -e AzSecPack_GCS_Config_Version="$azSecPackGcsConfigVersion" \
        -e AzSecPack_EventVersion="$azSecPackEventVersion" \
        -e AzSecPack_Timestamp="$azSecPackTimestamp" \
        -e AzSecPack_Namespace="$azSecPackNamespace" \
        -e AzSecPack_Moniker="$azSecPackMoniker" \
        -e AzSecPack_Tenant="$azSecPackTenant" \
        -e AzSecPack_Role="$azSecPackRole" \
        -e AzSecPack_RoleInstance="$azSecPackRoleInstance" \
        -e AzSecPack_MachineName="$azSecPackRoleInstance" \
        "$azSecPackImagePath"

    echo "Successfully started az security pack container"
}

removeOldAzSecPack() {
    echo "Removing old az security pack images"

    local azSecPackImageNamePattern='genevasecpackinstall:master_*'
    local azSecPackCurrentImagePath="$azSecPackContainerRegistry/$azSecPackImageName"
    local azSecPackImagesPattern="$azSecPackContainerRegistry/$azSecPackImageNamePattern"

    # shellcheck disable=SC2140
    local listOfAZSecImages=$(docker images --filter=reference=$azSecPackImagesPattern --format "{{.Repository}}:{{.Tag}}")
    local listOfAZSecImagesArr=(${listOfAZSecImages// / })

    for image in "${listOfAZSecImagesArr[@]}"
    do
        echo "image= $image"
        if [ $image != $azSecPackCurrentImagePath ]; then
            echo "Deleting az security pack image $image"
            docker rmi $image
        fi
    done

    echo "Successfully removed old az security pack images"
}

setupAzSecPack() {
    echo "Installing az cli"
    curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

    export isDevMode
    loginToAzure

    export azSecPackGcsEnvironment
    export azSecPackGcsAccount
    export azSecPackGcsConfigVersion
    export azSecPackEventVersion
    export azSecPackTimestamp
    export azSecPackNamespace
    export azSecPackMoniker
    echo "loading az sec pack config variables"
    . "${0%/*}/az-sec-pack-profile.sh"

    export azSecPackTenant
    export azSecPackRole
    export azSecPackRoleInstance
    getContextInfo

    export secretsDirPath
    secretsDirPath="${0%/*}/secret"
    echo "Creating secrets directory - $secretsDirPath if it doesn't exist"
    mkdir -p "$secretsDirPath"

    export azSecPackRegistryAccessSpAppId
    export azSecPackRegistryAccessSpPassword
    export pfxFileName
    export pfxPath
    pfxFileName="az-sec-pack-cert.pfx"
    pfxPath="$secretsDirPath/$pfxFileName"
    fetchSecretsFromKeyVault

    runAzSecPack

    removeOldAzSecPack
}

# Read script arguments
while getopts "k:s:" option; do
    case $option in
    k) KEY_VAULT_NAME=${OPTARG} ;;
    s) subscription=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $KEY_VAULT_NAME ]]; then
    exitWithUsageInfo
fi

setupAzSecPack
