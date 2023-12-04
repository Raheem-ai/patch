# Project layout
- `frontend/` houses the code for the React Native app. See it's [readme](./frontend/README.md) for more details.
- `backend/` houses the code for the api server. See it's [readme](./backend/README.md) for more details.
- `common/` houses types and code that are shared between the front end and backend. Currently no dependencies are allowed in `common`.
- `ci/` houses shell scripts and build definitions (currently running on [Google Cloud Build](https://cloud.google.com/build/docs)). See it's [readme](./ci/README.md) for more details.

# Cloning the repo
`--recurse-submodules` will init and clone all nested submodules in the project
```sh
git clone --recurse-submodules https://github.com/Raheem-ai/patch.git
```

# Local Development

## Dependencies/Setup
- [Docker](https://www.docker.com/products/docker-desktop)
- [Node/NPM 16.9.1+](https://nodejs.org/en/download/)
- [Expo cli](https://docs.expo.dev/)
- [Ngrok](https://ngrok.com/download)
- [Yarn](https://yarnpkg.com/getting-started/install) (just run the commands under "Install Corepack")
    then run 
    ```
    $> yarn set version berry
    $> yarn install
    ```
- add provided env specific credentials for certain GCP apis in `$RAHEEM_INFRA_ROOT/config/raheem-<env>-adc.json`

## Infra project
A seperate github project that is pulled in as a git submodule, the infra project is a centralized abstraction around system level resources like secrets/config that tie into technical resources like a 3rd party api key or redis cache. It simultaneously handles the creation/update of config/secrets, automating dev ops tasks around their management via a CLI, and backend services consuming them in code. Because the project is brought in as a submodule, changes to infrastructure can be deployed in lockstep with the features that depend on them.

The infra project sits in the root of the project it is embedded in. It expects a config file in the embedding projct and a designated directory outside of all projects to use as a workspace. Please read through the [Infra README](backend/infra/README.md) for setup instructions and more info.

## Spinning up dev (local) environment
As a one off step, you need to generate the dev (local) config for the backend to consume 
(You will need to re-run this whenever you add/update a secret/config in infra)
```sh
# from `backend/`
> yarn run build
> yarn node infra/bin/run config:generate -e dev  
```

Once you have generated `backend/env/.env.dev`, there are 5 commands that need to be run in different shells to simulate an environment locally


Start ngrok to get a public url for your local dev server
```sh
# from anywhere
$> ngrok http 9000
```

Start mock GCP PubSub instance for backend events -> ui updates
```sh
# from anywhere
$> docker run --rm -it -p 8681:8681 gcr.io/google.com/cloudsdktool/cloud-sdk gcloud beta emulators pubsub start --project=fake
```

Start mock redis instance (for socket.io websocket adapter to use)
```sh
# from anywhere
$> docker run --rm -it -p 6379:6379 redis
```

Start backend 
```sh
# from `backend/`
$> yarn run dev
```

Start frontend
```sh
# from `frontend/`
$> yarn install 
$> yarn run dev
``` 

## Testing locally on a phone
- spin up dev environment
- copy the https url that ngrok outputs (in the form of `https://<hash>.ngrok.io`) and change the initial value of `apiHost` in `frontend/app.config.js` (*Don't check in changes to the initialization of apiHost*)
- download [expo go app](https://expo.dev/client)
- create account?
- scan qr code produced by `$> expo start --no-https` and follow the link

## Build/Deployment

### Backend
The building of the backend image and it's deployment to staging/prod happends through GCP's CI/CD triggered by git. The definition for the backend build/deploy pipeline can be found at `backend/deployment/api.build.json`

To test building/running the container locally run 
```sh
# from `<root>/`
$> docker build -f ./api.dockerfile .  # this will produce <imageId>
$> docker run --rm -it --env-file ./backend/env/.env.dev <imageId>
```

### Frontend (TODO: tie this into the build)
The frontend is currently deployed locally via the expo cli
```sh
$> expo publish --release-channel <prod | staging>
```

# TODO: Standing up an Environment
- create redis instance
- create pubsub instance/enable the api?
- set up apikey for google tings 
    - google maps api for iOS 
    - google maps api for Android
    - google place api
    - google geocoding api 
    - [restrict google api key for ios app with the bundle identifier ai.raheem.patch.<env>](https://console.cloud.google.com/google/maps-apis/credentials?)
        - also add ai.raheem.patch.dev for non-prod environments
- set up build hooks (if we wanT ci/cd on it)
- add secrets to secret store
    - expo build-deploy-bot-secret
    - infra git deploy key (write perms): 'infra-git-ssh-key'
    - patch git deploy key (write perms): 'patch-git-ssh-key'


# Dev Ops Tasks

## Creating git deploy key
1) Create the pub/priv key pair
```sh
ssh-keygen -t ed25519 -C "what's this key for?"
```

2) [Add](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account) pub key to target repo's deploy keys.

3) put prive key in the secret store so it can be securely accessed at build/deploy time 



## Setting up infra admin credentials on mongo db so we can programatically update it
1) go to cloud.mongodb.com and [create a new API Key](https://docs.atlas.mongodb.com/configure-api-access/)
2) install mongocli in mongo dockerfile
```sh
# TODO: not sure how to rotate this infra level key programatically but that's okay for now

```


# Deployment Scenarios [WIP]
TLDR; can't have any breaking changes on the backend without releasing a back compat version first OR booting everyone to the newest version

NOTE: appstore webhooks don't exist to know when a new version is available in the store

NOTE: might need to lock serverside versions with the native app version they went out with 
so we never have an older app version looking at a newer serverside version, make dynamicConfig something publicly accessable so all app versions
can force upgrading if needed, and update dynamic config when we depricate older app versions
    - challenges:
        - having dynamic config accessable to all app versions while routing all other api calls to the right version specific serverside deployment

then deployed versions would look like

TERMINOLOGY: 
- Base Version: the native version of the front end that non breaking changes to either the frontend/backend 
will be applied to
- Runtime Version: the version in time that an app is using which could be N iterations of non breaking changes to
the front/backend...runtime versions are always tied to a Base Bersion

ASSUMPTIONS: any breaking backend change will be accompanied by a front end change 

NOTE: redo this with the following syntax 
F(xn) = base version x, runtime version n for the front
B(xn) = base version x, runtime version n for the back
- ... = iterations of runtime versions on a base version (concurrent backend versions running at the same time)
F(xn)' = a breaking change from the backend caused the front end to need to be redeployed
B(xn)' = a breaking change from the frontend caused the backend to need to be redeployed
<!-- X' = it had a non breaking change
'X = a breaking change from the other one caused it to need to be redeployed -->

1) Non-native frontend change
- F(a1) B(a1) -> F(a2) B(a1)

2) Native frontend change
- F(a1) B(a1)
- F(b1) B(b1)

3) Backcompat backend change
- F(a1) B(a1) -> F(a1) B(a2)

4) Breaking backend change
- F(a1) B(a1)
- F(b1) B(b1)

5) 1 + 3 + 2 + 4 + 1
 - F(a1) B(a1) -> F(a2) B(a1) -> F(a2) B(a2)
 - F(b1) B(b1)'
 - F(c1)' B(c1) -> F(c2)' B(c1)

<!--  -->

1) Non-native frontend change
- front(A) back(A) -> front(A') back(A)

2) Native frontend change
- front(A) back(A)
- front(B) back(B)

3) Backcompat backend change
- front(A) back(A) -> front(A) back(A')

4) Breaking backend change
- front(A) back(A)
- front(B) back(B)

NOTE: ^^^I actually think this one might be able to just deploy the new backend with the corresponding non
breaking changes to the frontend...except their would be a time period where people haven't closed and reopened the app to get the latest from the front end so someone using the frontend when we deploy could have the backend break their experience

5) 1 + 3 + 2 + 4 + 1
 - front(A) back(A) -> front(A') back(A) -> front(A') back(A')
 - front(B') back(B')
 - front(C') back(C') -> front(C'') back(C')

 NOTE: this means breaking backend changes cause frontend to be rebuilt

## Frontend changes (EX. changes to a string, color, etc)
    - regular deployment
        - deploy backend
        - deploy frontend
        - switch traffic to new backend 

## Breaking backend changes + frontend changes (EX. moving store to use diffs)
    - regular deployment of back compat backend version + frontend changes
    - users will automatically be updated to newest frontend when they reopen app
    - use analytics to know when everyone is using the latest version
    - remove back compat code

## Native frontend changes (EX. new ui that needed a native lib) (`dynamicConfig.appVersion.requiresUpdate == false`)
    - Create new Expo Build + upload to app stores
    - Deploy
        - Do first deployment to frontend (will be tied to new native version so no one will see it yet)
        - Do deployment of backend (exposed to everyone but not a problem since there is nothing breaking)
    - Release new versions to app stores
    - run `dynamicConfig:update` to Tell people there is a new version out so they can be prompted to update from the app store (update DynamicConfig + send event on pubsub)

## Breaking backend changes + Native Frontend changes (EX. switching to E2EE branch) (`dynamicConfig.appVersion.requiresUpdate == true`)
    - Create new Expo Build + upload to app stores
    - Deploy
        - Do first deployment to frontend (will be tied to new native version so no one will see it yet)
        - Do deployment of backend (don't switch traffic yet so old verions still work)
    - Release new versions to app stores
    - run `dynamicConfig:update` to Tell people there is a new version out that is required so they can be prompted to force update from the app store (update DynamicConfig + send event on pubsub)
    - switch traffic to service the newest version everyone has to onboard to

## Failure points
    - users on front(A) and back(A)
    - release non-breaking front(B)
        - ex. update scroll wheel input to use different native lib
        - some users on front(A) back(A)
        - some users on front(B) back(A)
    - release breaking back(B) with front(B')
        - ex. upgrade mongoose version on backend so db semantics (and thus api responses) slightly change
        - some users on front(A) back(B) [BROKEN]
        - some users on front(B') back(B)


## End Result Process
1) CLI steps...release:create
- make sure your local branch is up to date with staging (should run this only when the latest staging has the changes we want to run)
- update required field in repo
    - in `version.js`
- create release commit with changelog (yaml file that includes fields for required, nativeVersion, and nativeChanges)...nativeChanges will come from prompt/param
- push the commit to origin with tag `rel-pre-<commit>`
    - wait for manual merge to kick off webhook (IN PROD GCP PROJECT)
- use cloud build webhook to
    <!-- - merge staging into master -->
    - Build docker container with front/back
        - actually already have this from the rc commit....use cache but need to get use this code cuz other parts need newest version config + release info
        - tag + push image w/ `patch-rel-pre-<commit>`
    - if nativeChanges, 
        <!-- - add a 'testing' tag to the commit into master -->
        - create new PreProd/Prod builds (should this be a separate job so 1. it can run async and 2. we can call it adhoc off a commit in master for consistency)
    - Deploy backend to PreProd url
    - if nativeChanges
        - Add new dynamic AppVersion config entry with 'testing' flag
        - Push first OTA updates to PreProd/Prod builds
    - if !nativeChanges 
        - push OTA updates to PreProd channel

2) Manual steps
- if nativeChanges
    - test new PreProd/Prod builds
    - submit Prod build to app stores
    - wait for BOTH iOS and Android app stores to approve the build
- if !nativeChanges 
    - test PreProd build

3) CLI steps release:approve
- have prompt to make sure we're looking at the right commit...prev: "appVersion config entry (do we need this to cleanup old PreProd builds that failed testing?)"
- promote PreProd backend to Prod
- retag + push image to `patch-rel-<commit>`
- merge release commit to master with tag `rel-<commit>`
- if nativeChanges
    - update existing dynamic AppVersion config 'testing' field to false
- if !nativeChanges 
    - push OTA updates to Prod
    - update existing dynamic AppVersion config 'required' field
        - ***only update from false to true***
- remove older dynamic AppVersion config entries that still have a testing flag and aren't the current build we're trying to promote

NOTE: 
    - Feature branches should be squashed before they go into staging and 
        - have their commit message be a list of changes (to be included in the changelog) where each line starts with '- '
    - Release creation branches should not be squashed when they merge into staging
    - Release approval branches should not be squashed when they merge into master


# Deployment V2 (FINAL)

## TERMINOLOGY: 
    - Base Version: the native version of the front end that non breaking changes to either the frontend/backend will be applied to
    - Runtime Version: the version in time that an app is using which could be N iterations of non breaking changes to the front/backend...runtime versions are always tied to a Base Version (Expo will only publish over the air updates to a single Base Version at a time so once we increment our Base Version, older Base versions will not recieve any updates unless they come through a hotfix or non-breaking changes to the backend that doesn't affect the logic of the frontend)


## ASSUMPTIONS: any breaking backend change will be accompanied by a front end change (that consumes the new API signature)

## GOALS:
    - No Runtime Version of the app on a user's phone ever run against an incompatible backend
        - We have a way to notify users that a new Base Version is ready for them to update to
        - We jave a way to force users to upgrade to the newest Base Version
        - Our deployment process is aware of both breaking changes (which necessitate an upgrade) and new Base versions (which stem from new native code but may not require an upgrade)
    - We can deploy any commit from staging (well currently any of the last 5 since we cleanup old builds as the code base iterates)
    - When we do need to bump the Base Version we can test new app builds against a PreProd environment that a) mirrors Prod so we have confidence our changes will land well and b) allows app store testers to use the new BaseVersion before we have finished fulling rolling it out (they have to approve us before we can finish releaseing a new app build)
    - Deployment procedures should tie into git so we can kick them off from our local machines safely

## PROCESS:
At a high level, the deployment process is as follows:
1) Create a release pointing at a target commit on staging and deploying to preprod
2) Test any/all OTA updates, backend changes, and native changes (new app build) in the preprod environment
3) If the release requires a new app build, get approval from each app store (their test accounts will run against preprod)
4) Release the newer versions to the appstore
5) Approve the release to promote it from preprod to prod 
6) Merge the `release branch` into staging and the `approve branch` into prod

### Creating a Release
Use the cli in `backend/infra` to create a new release. 

```sh
$> cd <path_to_patch_repo_root>
$> git fetch
$> git checkout staging
$> git pull
$> cd backend/infra
$> ./bin/run release:create
```

Creating a new release does the following on your local machine:
    - Makes sure your local branch is up to date with origin staging (to make sure you have the most update version of infra code)
    - Asks you to confirm a `target commit` to release
    - Creates a new `release branch` that uses the `target commit` as its base branch
    - Asks you to confirm that the version info in `frontend/version.js` is up to date. If it isn't you can edit and save it in your editor and then confirm the prompt in the cli. NOTE: this is the step where you should update the `REQUIRES_UPDATE` flag in `frontend/version.js` if the backend has breaking changes.
    - Asks you to confirm if there were native changes involved in this release
    - Collects the changes from all the git commit logs between the `target commit` and the last approved release that start with `- ` and creates a new changelog entry that saves all the data we just confirmed to `changelog.yaml`
    - Stages and commits the changes to `changelog.yaml` and (possibly) `frontend/version.js` on the new `release branch` while also making sure you didn't change any other files (They wouldn't get updated anyway but we'll get to that later)
    - Tags the `release branch` with `rel-pre-<targetCommit>` and pushes the branch and it's tag to origin so we can create a PR with at against `staging` BUT NOT MERGE IT (yet)
    - The push of the tag starts the CICD job in `ci/jobs/build_deploy_preprod.json`

* If you run into an error creating a release, run the command again with the `--cleanup` flag to reset the local/remote state for the branches/tags involved in the `release:create` command *

TODO: what the CICD job does

### Approving a Release
Use the cli in `backend/infra` to approve a previously created release. 

```sh
$> cd <path_to_patch_repo_root>
$> git fetch
$> cd backend/infra
$> ./bin/run release:approve -c <target_commit>
```

Approving a new release does the following on your local machine:
    - Checks out the remote `release branch` that was created by the `release:create` command
    - Makes sure the target commit you passed is in the changelog and asks you to confirm it is the correct release you want to approve
    - Creates an `approve branch` based on the remote `release branch` (to make sure no local changes can slip in)
    - Merges `origin/master` into the new `approve branch` 
    - Tags the branch with `rel-prod-<targetCommit>`
    - Pushes the `approve branch` and it's tag to the remote so that we can create a PR with it against `master` BUT NOT MERGE IT (yet)
    - The push of the tag starts the CICD job in `ci/jobs/aprrove_release.json`

TODO: Detail what the CICD job does

## Caveats/Scenarios not covered
1) Because `prod` and `preprod` are actually the same env in terms of their resources in GCP (db, secrets, etc) doing a deployment that includes a DB migration would mean running it against prod even if we're just trying to test in preprod. This means that any migrations should either be additive at the record level or create new collections vs changing old ones. Other options include, actually separating prod/preprod out to be separate envs but then we lose the confidence of working against a mirror of prod. Could also dynamically have preprod's DB get populated from prods so the data is the same before testing but I'm not sure what that would actually look like

2) Hot fix scenario as older Base Versions of the app would need their OTA updates to be deployed from a docker image that has the code (version info, front end features, etc) from their release + the new code changes. I'm not exactly sure how to add the new code into an existing image and then save it to deploy from but I think it's doable (similar to part of the CICD steps for creating a release image). If nothing else, OTA updates could be done from someones local if they are on a branch that matches the `approve branch` with the new hotfix changes merged in. They would just have to be EXTRA careful that their dependencies are up to date locally etc.