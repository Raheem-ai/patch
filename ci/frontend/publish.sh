# files that should trigger a publish
FILES_TO_INCLUDE=("common/**/*" "frontend/**/*" "ci/**/*")

# files that shouldn't trigger a publish
FILES_TO_IGNORE=("frontend/README.md")

# import utils for publish logic
my_dir="$(dirname "$0")"
source $my_dir/../common/utils.sh

# files that were changed in the commit
FILES=$(cat changedFiles.txt) 

if should_deploy FILES FILES_TO_INCLUDE FILES_TO_IGNORE;
then
    echo $(pwd)

    # generate secretes in a format gcloud can comsume them
    # echo /app/backend/infra/bin/run config:generate -e $_ENVIRONMENT --toFile /app/backend/env/.env.$_ENVIRONMENT
    # /app/backend/infra/bin/run config:generate -e $_ENVIRONMENT --toFile /app/backend/env/.env.$_ENVIRONMENT

    echo cd /app/frontend
    cd /app/frontend

    echo $(pwd)

    # echo "# installing frontend deps for publish"
    # yarn install

    echo "# logging into expo"
    node_modules/expo-cli/bin/expo.js login --non-interactive 
    
    echo "# publishing to release channel '$_ENVIRONMENT'"
    node_modules/expo-cli/bin/expo.js publish --release-channel $_ENVIRONMENT
else
    echo "# no frontend changes to deploy"
fi