IMAGE_REPO=patch-tmp
IMAGE=gcr.io/$PROJECT_ID/$IMAGE_REPO:$BRANCH_NAME
STAGING_IMAGE=gcr.io/$PROJECT_ID/patch-rc:latest

build_temp () {
    # try and pull tmp image from registry
    if docker pull $IMAGE ; then
        # build using cache from this branch
        docker build -t $IMAGE -f api.dockerfile --cache-from $IMAGE .
    else
        if docker pull $STAGING_IMAGE ; then
            # build using cache from staging (which this branch should have forked from)
            docker build -t $IMAGE -f api.dockerfile --cache-from $STAGING_IMAGE .
        else 
            # build fresh
            docker build -t $IMAGE -f api.dockerfile .
        fi
    fi
}

if build_temp ; then
    # if built successfully save image for cache
    docker push $IMAGE
else 
    exit $?
fi