if test -f "/workspace/has_native_changes";
then
    echo "# Add new dynamic AppVersion config entry with 'testing' flag"
    /app/backend/bin/run dynamicConfig:update --newNativeVersion
else
    echo "# No native changes. Skipping dynamic config update"
fi