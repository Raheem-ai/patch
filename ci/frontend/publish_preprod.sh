
echo cd /app/frontend
cd /app/frontend

echo $(pwd)

echo "# setting up google fcm credentials"
_UPDATE_ENVIRONMENT=preprod node /app/frontend/eas_build/preInstall.mjs

if test -f "/workspace/has_native_changes";
then
    echo "# Pushing OTA updates to preprod + prod"
    yarn run update:preprod:ci
    yarn run update:prod:ci
else
    echo "# Pushing OTA updates to preprod"
    yarn run update:preprod:ci
fi