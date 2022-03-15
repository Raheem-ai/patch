
echo cd /app/frontend
cd /app/frontend

echo $(pwd)

# echo "# installing frontend deps for publish"
# yarn install

echo "# logging into expo"
node_modules/expo-cli/bin/expo.js login --non-interactive 

echo "# publishing to release channel '$_ENVIRONMENT'"
node_modules/expo-cli/bin/expo.js publish --release-channel $_ENVIRONMENT
