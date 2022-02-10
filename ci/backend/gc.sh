#!/usr/bin/env bash

main(){
  local C=0
  IMAGES_TO_KEEP=5
  IMAGE_REPO=gcr.io/$PROJECT_ID/patch-rc

  for digest in $(gcloud container images list-tags ${IMAGE_REPO} --limit=999999 --sort-by=~TIMESTAMP --format='get(digest)'); do
    (
        if [ $C -lt $IMAGES_TO_KEEP ]
        then
            echo keeping ${digest}
        else
            echo deleting ${digest}
            gcloud container images delete -q --force-delete-tags "${IMAGE_REPO}@${digest}"
        fi
    )
    let C=C+1
  done
}
main 
