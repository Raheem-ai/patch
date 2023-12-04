
echo cd /app/frontend
cd /app/frontend

setupPreProd() {
    echo "# setting up google fcm credentials for preprod"
    _UPDATE_ENVIRONMENT=preprod node /app/frontend/eas_build/preInstall.mjs
}

setupProd() {
    echo "# setting up google fcm credentials for prod"
    _UPDATE_ENVIRONMENT=prod node /app/frontend/eas_build/preInstall.mjs
}


if test -f "/workspace/has_native_changes";
then
    echo "# Pushing OTA updates to preprod"
    setupPreProd
    yarn run update:preprod:ci

    echo "# Pushing OTA updates to prod"
    setupProd
    yarn run update:prod:ci
else
    echo "# Pushing OTA updates to preprod"
    setupPreProd
    yarn run update:preprod:ci
fi