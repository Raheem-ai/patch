tagBranch() {
    # making sure we are honoring the ssh_config by using the host 'patch'
    echo git remote set-url origin "patch:Raheem-ai/patch.git"
    git remote set-url origin "patch:Raheem-ai/patch.git"

    # set user info for git log 
    git config --global user.email "${_CI_EMAIL}" && git config --global user.name "${_CI_USERNAME}"

    # tag current commit with rc-$SHORT_SHA
    git tag -a rc-$SHORT_SHA -m "Patch Release Candidate $SHORT_SHA" $SHORT_SHA || echo tagging failed

    # push tag
    git push origin rc-$SHORT_SHA
}


if test -f "/workspace/should_deploy_backend";
then
    echo "# deploying new service revision"
    if gcloud beta run deploy $_SERVICE --image=gcr.io/$PROJECT_ID/patch-rc:$SHORT_SHA --region=us-central1 --set-secrets=$(cat secretConfig.txt) "--set-env-vars=^##^$(cat config.txt)";
    then
        tagBranch
    else
        echo "ERROR: deployment failed"
        echo "1" >> deployment_failed.txt
        # exit 1
    fi
else
    tagBranch
    echo "# no backend changes to deploy"
fi

tagBranch() {
    # making sure we are honoring the ssh_config by using the host 'patch'
    echo git remote set-url origin "patch:Raheem-ai/patch.git"
    git remote set-url origin "patch:Raheem-ai/patch.git"

    # set user info for git log 
    git config --global user.email "${_CI_EMAIL}" && git config --global user.name "${_CI_USERNAME}"

    # tag current commit with rc-$SHORT_SHA
    git tag -a rc-$SHORT_SHA -m "Patch Release Candidate $SHORT_SHA" $SHORT_SHA || echo tagging failed

    # push tag
    git push origin rc-$SHORT_SHA
}