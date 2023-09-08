PROD_TAG=prod-$TARGET_COMMIT

echo "# promoting preprod service revision to prod"

echo "# gcloud beta run deploy $_SERVICE --image=gcr.io/$PROJECT_ID/patch-rel-prod:$TARGET_COMMIT --tag=$PROD_TAG --no-traffic --region=us-central1 --set-secrets=$(cat secretConfig.txt) \"--set-env-vars=^##^$(cat config.txt)\""

if gcloud beta run deploy $_SERVICE --image=gcr.io/$PROJECT_ID/patch-rel-prod:$TARGET_COMMIT --tag=$PROD_TAG --no-traffic --region=us-central1 --set-secrets=$(cat secretConfig.txt) "--set-env-vars=^##^$(cat config.txt)";    
then
    # echo "# gcloud run services update-traffic $_SERVICE --project $PROJECT_ID --region=$REGION --to-tags=$PROD_TAG=100"
    
    # if gcloud run services update-traffic $_SERVICE --project $PROJECT_ID --region=$REGION --to-tags=$PROD_TAG=100;
    # then
    #     echo "Switched all trafic to latest revision"
    # else
    #     echo "ERROR: switching traffic failed"
    #     exit 1
    # fi

    echo "Deployed to prod"
else
    echo "ERROR: deployment failed"
    echo "1" >> deployment_failed.txt
fi
