set -eo pipefail

. './utilities/create-queue.sh'

# Read script arguments
while getopts "s:" option; do
case $option in
    s) storageAccountName=${OPTARG};;
esac
done

createQueue "scanrequest" "$storageAccountName"
createQueue "scanrequest-dead" "$storageAccountName"