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

    echo cd /app/frontend
    cd /app/frontend

    echo $(pwd)

    # echo "# logging into expo"
    # node_modules/expo-cli/bin/expo.js login --non-interactive 

    echo "# publishing update to branch '$_ENVIRONMENT'"
    node_modules/eas-cli/bin/run update --branch $_ENVIRONMENT --non-interactive --message $COMMIT_SHA
else
    echo "# no frontend changes to deploy"
fi