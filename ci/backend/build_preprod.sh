TAG=$(git describe $SHORT_SHA --tags)

# commit part of rel-pre-<commit>
TARGET_BUILD=$(echo $TAG | cut -f3 -d-)

TMP_IMAGE=gcr.io/$PROJECT_ID/patch-rc:$TARGET_BUILD
PREPROD_IMAGE=gcr.io/$PROJECT_ID/patch-rel-pre:$SHORT_SHA
LATEST_PREPROD_IMAGE=gcr.io/$PROJECT_ID/patch-rel-pre:latest

build_preprod () {
    # pull target rc image from registry
    if docker pull $TMP_IMAGE ; then
        # build using cache from rc build which should be exactly the same except for 
        # updated changelog/version config
        docker build -t $PREPROD_IMAGE -t $LATEST_PREPROD_IMAGE -f api.dockerfile --cache-from $TMP_IMAGE .
    else
        # fail as the target build should always be there
        echo "Couldn't find image $TMP_IMAGE for target build $TARGET_BUILD"
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