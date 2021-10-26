#!/usr/bin/env bash

# RED='\033[0;31m'
# YELL='\033[1;33m'
# NC='\033[0m' # No Color

# IMAGES_TO_KEEP="5"
# IMAGE_REPO="gcr.io/$PROJECT_ID/patch"

# # Get all images at the given image repo
# echo -e "${YELL}Getting all images for repo ${IMAGE_REPO}${NC}"
# IMAGELIST=$(gcloud container images list --repository=${IMAGE_REPO} --format='get(name)')
# gcloud container images list --repository=${IMAGE_REPO} --format='get(name)'
# echo "${IMAGELIST}"

# while IFS= read -r IMAGENAME; do
#   IMAGENAME=$(echo $IMAGENAME|tr -d '\r')
#   echo -e "${YELL}Checking ${IMAGENAME} for cleanup requirements${NC}"

#   # Get all the digests for the tag ordered by timestamp (oldest first)
#   DIGESTLIST=$(gcloud container images list-tags ${IMAGENAME} --sort-by timestamp --format='get(digest)')
#   DIGESTLISTCOUNT=$(echo "${DIGESTLIST}" | wc -l)

#   if [ ${IMAGES_TO_KEEP} -ge "${DIGESTLISTCOUNT}" ]; then
#     echo -e "${YELL}Found ${DIGESTLISTCOUNT} digests, nothing to delete${NC}"
#     continue
#   fi

#   # Filter the ordered list to remove the most recent 3
#   DIGESTLISTTOREMOVE=$(echo "${DIGESTLIST}" | head -n -${IMAGES_TO_KEEP})
#   DIGESTLISTTOREMOVECOUNT=$(echo "${DIGESTLISTTOREMOVE}" | wc -l)

#   echo -e "${YELL}Found ${DIGESTLISTCOUNT} digests, ${DIGESTLISTTOREMOVECOUNT} to delete${NC}"

#   # Do deletion or say nothing to do
#   if [ "${DIGESTLISTTOREMOVECOUNT}" -gt "0" ]; then
#     echo -e "${YELL}Removing ${DIGESTLISTTOREMOVECOUNT} digests${NC}"
#     while IFS= read -r LINE; do
#       LINE=$(echo $LINE|tr -d '\r')
#         gcloud container images delete ${IMAGENAME}@${LINE} --force-delete-tags --quiet
#     done <<< "${DIGESTLISTTOREMOVE}"
#   else
#     echo -e "${YELL}No digests to remove${NC}"
#   fi
# done <<< "${IMAGELIST}"

main(){
  local C=0
#   IMAGE="${1}"
#   DATE="${2}"
  IMAGES_TO_KEEP="5"
  IMAGE_REPO="gcr.io/$PROJECT_ID/patch"
  for digest in $(gcloud container images list-tags ${IMAGE_REPO} --limit=999999 --sort-by=TIMESTAMP --format='get(digest)'); do
    (
    #   set -x
    #   gcloud container images delete -q --force-delete-tags "${IMAGE}@${digest}"
    echo ${digest}
    )
    let C=C+1
  done
#   echo "Deleted ${C} images in ${IMAGE}." >&2
}
# main "${1}" "${2}"
main 
