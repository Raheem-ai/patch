# files that were changed in the commit
FILES=$(git diff-tree --no-commit-id --name-only -r $COMMIT_SHA)
# files that should trigger a publish
FILES_TO_INCLUDE=("common/*" "backend/*" "ci/*")
# files that shouldn't trigger a publish
FILES_TO_IGNORE=("backend/README.md")

# import utils for publish logic
my_dir="$(dirname "$0")"
source $my_dir/../common/utils.sh

echo git log
git log || echo no git log

if should_publish FILES FILES_TO_INCLUDE FILES_TO_IGNORE;
then
    echo "# deploying new service revision"
    gcloud beta run deploy $_SERVICE --image=gcr.io/$PROJECT_ID/patch-rc:$SHORT_SHA --region=us-central1 --set-secrets=$(cat secretConfig.txt) "--set-env-vars=^##^$(cat config.txt)"
    
    # todo tag current commit with rc-$_SHORT_SHA
else
    echo "# no backend changes to deploy"
fi