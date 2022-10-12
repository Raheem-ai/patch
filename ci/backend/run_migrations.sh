cd /app/backend
MIGRATIONS_TO_RUN=$(yarn run migration:status | grep -c pending)

if [ $MIGRATIONS_TO_RUN -gt 0 ];
then
    if yarn run migration:up;
    then
        echo $MIGRATIONS_TO_RUN >> /workspace/migration_count.txt
    else 
        echo "# One more more pending migrations failed"
        exit 1
    fi
else
    echo "# No pending migrations to run"
fi
