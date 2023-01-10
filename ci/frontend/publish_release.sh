
echo cd /app/frontend
cd /app/frontend

echo $(pwd)

echo "# setting up google fcm credentials"
_UPDATE_ENVIRONMENT=$_ENVIRONMENT node /app/frontend/eas_build/preInstall.mjs

echo "# publishing update to branch '$_ENVIRONMENT'"
yarn run update:prod:ci