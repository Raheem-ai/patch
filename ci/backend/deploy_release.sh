

# import utils for publish logic
# my_dir="$(dirname "$0")"
# source $my_dir/../common/utils.sh

echo "# deploying new service revision"
# TODO: this is not stopping build when the deployment fails -_-
if gcloud beta run deploy $_SERVICE --image=gcr.io/$PROJECT_ID/patch-rc:$_RELEASE_ID --region=us-central1 --set-secrets=$(cat secretConfig.txt) "--set-env-vars=^##^$(cat config.txt)";
then
    # # making sure we are honoring the ssh_config by using the host 'patch'
    # echo git remote set-url origin "patch:Raheem-ai/patch.git"
    # git remote set-url origin "patch:Raheem-ai/patch.git"

    # # set user info for git log 
    # git config --global user.email "${_CI_EMAIL}" && git config --global user.name "${_CI_USERNAME}"

    # # tag current commit with rc-$SHORT_SHA
    # git tag -a rc-$SHORT_SHA -m "Patch Release Candidate $SHORT_SHA" $SHORT_SHA || echo tagging failed

    # # push tag
    # git push origin rc-$SHORT_SHA
    echo "deployed to prod!"
else
    exit 1
fi