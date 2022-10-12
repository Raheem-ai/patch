if test -f "deployment_failed.txt";
then
    echo "# Deployment failed...checking for migrations to revert"
    # NOTE: this means each migration should do a deployment so if it fails it is automatically reverted
    # if we have more than one data transformation they should all go into the same migration if they are for the same
    # feature...we have the count of pending migrations that were applied but the library doesn't give us a way of reverting multiple...only last or all 
    # *facepalm*
    if test -f "/workspace/migration_count.txt"; 
    then
        cd /app/backend
        yarn run migration:down --last
    else 
        echo "# no migrations to revert"
    fi
    
    exit 1
fi  