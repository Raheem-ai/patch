#!/usr/bin/env bash
IMAGE_REPO=patch-tmp
BASE_IMAGE=gcr.io/$PROJECT_ID/$IMAGE_REPO
IMAGES_TO_KEEP="1"

# only keep one copy of each tmp image
clean_dup_images(){
#   local C=0
#   for digest in $(gcloud container images list ${BASE_IMAGE} --filter label=branch=$BRANCH_NAME --limit=999999 --sort-by=~TIMESTAMP); do
#     (
#         if [ $C -lt $IMAGES_TO_KEEP ]
#         then
#             echo keeping ${digest}
#         else
#             echo deleting ${digest}
#             # gcloud container images delete -q --force-delete-tags "${BASE_IMAGE}@${digest}"
#         fi
#     )
#     let C=C+1
#   done
gcloud container images list-tags ${BASE_IMAGE} --filter='-tags:*'  --format='get(digest)' --limit=999999
}

clean_old_images(){
    DATE=$(date --date="3 day ago" "+%Y-%m-%d")
    echo removing tmp images created before $DATE
    for digest in $(gcloud container images list-tags ${BASE_IMAGE} --limit=999999 --sort-by=~TIMESTAMP --filter="timestamp.datetime < '${DATE}'" --format='get(digest)'); do
        (
            echo deleting ${digest}
            gcloud container images delete -q --force-delete-tags "${BASE_IMAGE}@${digest}"
        )
    done
}


clean_dup_images 
clean_old_images
