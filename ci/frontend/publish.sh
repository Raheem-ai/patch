# files that were changed in the commit
FILES=$(git diff-tree --no-commit-id --name-only -r $COMMIT_SHA)
# files that should trigger a publish
FILES_TO_INCLUDE=("common/*" "frontend/*" "ci/*")
# files that shouldn't trigger a publish
FILES_TO_IGNORE=("frontend/README.md")

# import utils for publish logic
my_dir="$(dirname "$0")"
source $my_dir/../common/utils.sh

if should_publish FILES FILES_TO_INCLUDE FILES_TO_IGNORE;
then
    echo "# logging into expo"
    frontend/node_modules/expo/bin/cli.js login --non-interactive 
    
    echo "# publishing to release channel '$_ENVIRONMENT'"
    frontend/node_modules/expo/bin/cli.js publish --release-channel $_ENVIRONMENT
else
    echo "# no frontend changes to deploy"
fi