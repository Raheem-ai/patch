#  retag + push image from `patch-rel-pre-<commit>` to `patch-rel-prod-<commit>`

PREPROD_IMAGE=gcr.io/$PROJECT_ID/patch-rel-pre:$TARGET_COMMIT
PROD_IMAGE=gcr.io/$PROJECT_ID/patch-rel-prod:$TARGET_COMMIT
LATEST_PROD_IMAGE=gcr.io/$PROJECT_ID/patch-rel-prod:latest

docker pull $PREPROD_IMAGE

docker tag $PREPROD_IMAGE $PROD_IMAGE
docker tag $PROD_IMAGE $LATEST_PROD_IMAGE

docker push $PROD_IMAGE
docker push $LATEST_PROD_IMAGE
