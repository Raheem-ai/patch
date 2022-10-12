if test -f "deployment_failed.txt"; then
    echo "# Reverting migrations after failed deployment"
    # NOTE: this means each migration should do a deployment so if it fails it is automatically reverted
    # if we have more than one data transformation they should all go into the same migration if they are for the same
    # feature
    cd /app/backend
    yarn run migration:down --last 
    exit 1
fi  