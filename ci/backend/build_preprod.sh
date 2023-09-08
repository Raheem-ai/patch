# echo git fetch --depth=10 --tags patch:Raheem-ai/patch.git $COMMIT_SHA
# git fetch --depth=10 --tags patch:Raheem-ai/patch.git $COMMIT_SHA

# echo git describe $SHORT_SHA --tags
# TAG=$(git describe $SHORT_SHA --tags)

# commit part of rel-pre-<commit>
# echo echo $TAG | cut -f3 -d-
# TARGET_COMMIT=$(echo $TAG | cut -f3 -d-)

RC_IMAGE=gcr.io/raheem-org-dev/patch-rc:$TARGET_COMMIT
PREPROD_IMAGE=gcr.io/$PROJECT_ID/patch-rel-pre:$TARGET_COMMIT
LATEST_PREPROD_IMAGE=gcr.io/$PROJECT_ID/patch-rel-pre:latest

build_preprod () {
    # pull target rc image from registry
    if docker pull $RC_IMAGE ; then
        # build using cache from rc build which should be exactly the same except for 
        # updated changelog/version config
        # docker build -t $PREPROD_IMAGE -t $LATEST_PREPROD_IMAGE -f api.dockerfile --cache-from $RC_IMAGE .
        docker create --name temp_container $RC_IMAGE

        docker cp changelog.yaml temp_container:/app/changelog.yaml
        docker cp frontend/version.js temp_container:/app/frontend/version.js

        docker commit temp_container $PREPROD_IMAGE
        docker tag $PREPROD_IMAGE $LATEST_PREPROD_IMAGE
    else
        # fail as the target build should always be there
        echo "Couldn't find image $RC_IMAGE for target build $TARGET_COMMIT"
        exit 1
    fi
}

if build_preprod ; then
    # if built successfully save image with build specific and latest rc tag
    docker push $PREPROD_IMAGE
    docker push $LATEST_PREPROD_IMAGE
else 
    exit $?
fi