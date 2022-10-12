
# generate secretes in a format gcloud can comsume them
/app/backend/infra/bin/run config:generate -e $_ENVIRONMENT --toFile secretConfig.txt --secretVersionList --noComments
# generate config in a format gcloud can comsume them
/app/backend/infra/bin/run config:generate -e $_ENVIRONMENT --toFile config.txt "--delim=##" --configList --noComments
# generate config in a location that build scripts can consume them 
/app/backend/infra/bin/run config:generate -e $_ENVIRONMENT --toFile /workspace/build_config.env --noComments
