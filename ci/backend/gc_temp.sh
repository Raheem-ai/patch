#!/usr/bin/env bash
IMAGE_REPO=patch-tmp
BASE_IMAGE=gcr.io/$PROJECT_ID/$IMAGE_REPO
IMAGE=$BASE_IMAGE:$BRANCH_NAME
IMAGES_TO_KEEP="1"

# only keep one copy of each tmp image
clean_dup_images(){
  local C=0
  for digest in $(gcloud container images list-tags ${IMAGE} --limit=999999 --sort-by=~TIMESTAMP --format='get(digest)'); do
    (
        if [ $C -lt $IMAGES_TO_KEEP ]
        then
            echo keeping ${digest}
        else
            echo deleting ${digest}
            gcloud container images delete -q --force-delete-tags "${IMAGE}@${digest}"
        fi
    )
    let C=C+1
  done
}

clean_old_images(){
    DATE=$(date --date="3 day ago" "+%Y-%m-%d")
    echo $DATE
    # for digest in $(gcloud container images list-tags ${BASE_IMAGE} --limit=999999 --sort-by=~TIMESTAMP --filter="timestamp.datetime < '${DATE}'" --format='get(digest)'); do
    #     (
    #         echo deleting ${digest}
    #         gcloud container images delete -q --force-delete-tags "${BASE_IMAGE}@${digest}"
    #     )
    # done
}


clean_dup_images 
clean_old_images
