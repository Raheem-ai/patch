IMAGE_REPO=patch-tmp
IMAGE=gcr.io/$PROJECT_ID/$IMAGE_REPO:$BRANCH_NAME

build_temp () {
    # try and pull tmp image from registry
    if docker pull $IMAGE ; then
        # build using cache
        docker build -t $IMAGE -f api.dockerfile --cache-from $IMAGE .
    else
        # build fresh
        docker build -t $IMAGE -f api.dockerfile .
    fi
}

if build_temp ; then
    # if built successfully save image for cache
    docker push $IMAGE
fi