set -eo pipefail

createQueue() {
    queue=$1
    storageAccountName=$2
    
    echo "Checking if queue $queue exists in storage account $storageAccountName"
    queueExists=$(az storage queue exists --name "$queue" --account-name "$storageAccountName" --query "exists")

    if [ $queueExists = true ]; then
        echo "$queue already exists"
    else
        az storage queue create --name $queue --account-name $storageAccountName
        echo "Successfully created $queue"
    fi
}