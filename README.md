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
- [Node/NPM 12+](https://nodejs.org/en/download/)
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

## Spinning up local environment
As a one off step, you need to generate the local config for the backend to consume 
(You will need to re-run this whenever you add/update a secret/config in infra)
```sh
# from `backend/` 
> yarn node infra/bin/run config:generate -e local  
```

Once you have generated `backend/env/.env.local`, there are 5 commands that need to be run in different shells to simulate an environment locally


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
$> expo start --no-https 
``` 

## Testing locally on a phone
- spin up dev environment
- copy the https url that ngrok outputs (in the form of `https://<hash>.ngrok.io`) and change the value of `extra.devUrl` in `frontend/app.json` (*Don't check in changes to devUrl*)
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
$> docker run --rm --it --env-file ./backend/env/.env.local <imageId>
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
- set up build hooks (if we wanT ci/cd on it)
- add secrets to secret store
    - expo build-deploy-bot-secret 
        - TODO: add to infra defs
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
