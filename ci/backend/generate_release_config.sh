
# generate secretes in a format gcloud can comsume them
/app/backend/infra/bin/run config:generate -e $_ENVIRONMENT --toFile secretConfig.txt --secretVersionList --noComments
# generate config in a format gcloud can comsume them
/app/backend/infra/bin/run config:generate -e $_ENVIRONMENT --toFile config.txt "--delim=##" --configList --noComments
