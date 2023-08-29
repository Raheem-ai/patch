echo "# deploying new service revision to preprod"

echo "# gcloud beta run deploy $_SERVICE --image=gcr.io/$PROJECT_ID/patch-rel-pre:$SHORT_SHA --tag=preprod --region=us-central1 --set-secrets=$(cat secretConfig.txt) \"--set-env-vars=^##^$(cat config.txt)\""

if gcloud beta run deploy $_SERVICE --image=gcr.io/$PROJECT_ID/patch-rel-pre:$SHORT_SHA --tag=preprod --region=us-central1 --set-secrets=$(cat secretConfig.txt) "--set-env-vars=^##^$(cat config.txt)";
then
    echo "Deployed to preprod"
else
    echo "ERROR: deployment failed"
    echo "1" >> deployment_failed.txt
fi
