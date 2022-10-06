

TMP_IMAGE=gcr.io/$PROJECT_ID/patch-tmp:$_MERGED_BRANCH
RC_IMAGE=gcr.io/$PROJECT_ID/patch-rc:$SHORT_SHA
LATEST_RC_IMAGE=gcr.io/$PROJECT_ID/patch-rc:latest

build_rc () {
    # try and pull tmp image from registry
    if docker pull $TMP_IMAGE ; then
        # build using cache from merged branch
        docker build -t $RC_IMAGE -t $LATEST_RC_IMAGE -f api.dockerfile --cache-from $TMP_IMAGE .
    else
        if docker pull $LATEST_RC_IMAGE ; then
            # build using cache from last staging build
            docker build -t $RC_IMAGE -t $LATEST_RC_IMAGE -f api.dockerfile --cache-from $LATEST_RC_IMAGE .
        else 
            # build fresh
            docker build -t $RC_IMAGE -t $LATEST_RC_IMAGE -f api.dockerfile .
        fi
    fi
}

if build_rc ; then
    # if built successfully save image with build specific and latest rc tag
    docker push $RC_IMAGE
    docker push $LATEST_RC_IMAGE
else 
    exit $?
fi