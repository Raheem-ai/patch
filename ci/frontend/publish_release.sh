
echo cd /app/frontend
cd /app/frontend

echo $(pwd)

# echo "# installing frontend deps for publish"
# yarn install

# echo "# logging into expo"
# node_modules/eas-cli/bin/run login --non-interactive 

echo "# publishing update to branch '$_ENVIRONMENT'"
yarn run update:prod:ci