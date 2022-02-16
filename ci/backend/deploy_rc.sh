# files that should trigger a publish
FILES_TO_INCLUDE=("common/**/*" "backend/**/*" "ci/**/*")

# files that shouldn't trigger a publish
FILES_TO_IGNORE=("backend/README.md")

# import utils for publish logic
my_dir="$(dirname "$0")"
source $my_dir/../common/utils.sh

# files that were changed in the commit
FILES=$(cat changedFiles.txt) 

if should_deploy FILES FILES_TO_INCLUDE FILES_TO_IGNORE;
then
    echo "# deploying new service revision"
    gcloud beta run deploy $_SERVICE --image=gcr.io/$PROJECT_ID/patch-rc:$SHORT_SHA --region=us-central1 --set-secrets=$(cat secretConfig.txt) "--set-env-vars=^##^$(cat config.txt)"
    
    # todo tag current commit with rc-$SHORT_SHA
    git tag -a rc-$SHORT_SHA -m "Patch Release Candidate $SHORT_SHA" $SHORT_SHA

    # todo push tags
else
    echo "# no backend changes to deploy"
fi