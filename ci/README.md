# CICD/Git flow

## Branches
- *Staging*: acts as our active dev branch that holds the latest code that we are actively working on. Corresponds with the release candidates (RCs)
that are running on staging. 
- *Master*: acts as a release history branch that corresponds to what is currently live in production. We only for from this branch when trying to put out a hotfix we can't promote through staging.

## Build Deploy 

### [Build Definitions](https://cloud.google.com/build/docs/build-config-file-schema)
- [build_temp](./backend/build_temp.json)
- [build_deploy_rc](./backend/build_deploy_rc.json)

### Typical flow
Dev creates a `feature_branch` off of `staging`, makes some changes, and pushes their changes to the remote. 
- `build_temp` build def is run to verify and cache their build

Dev creates PR from `feature_branch` to `staging`
- Branch can't be merged until the `build_temp` build def completes successfuly 
- Branch can't be merged without being up to date with `staging`. (Dev needs to merge on their side so `build_temp` build def runs again to verify merge)

PR is merged into `staging`
- run `build_deploy_rc` build def to 
    - build rc docker image using `build_temp` build def artifacts as cache
    - deploy the backend if changes have been made to it or common/ci code
    - publish the frontend to the staging channel if changes have been made to it or common/ci code
    - mark that git commit as being a RC so we can reliably know what files have changed between RCs

## TODO: Production deploy

## TODO: Hotfix Flow
Dev forks from latest Release on `master`, fixes bug, and pushed their changes to the remote.
- `build_hotfix` build def is run with latest Release as cache

where does this get deployed to verify/get promoted to master?

post deployment Dev has to merge the hotfix into staging (probably should be a rebase...may or may not be shitty depending on history) and any RC before that merge needs to be invalidated