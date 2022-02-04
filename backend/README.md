# Architecture

## System Events 
Whenever a resource (user, org, request, etc.) is created, edited, or deleted
the backend publishes an [event](https://docs.google.com/spreadsheets/d/1YQmG5ma7kgEhE-Tj6ImglyIVYrhy8u4WS6DltR7qnLM/edit#gid=0) (through [Google PubSub](https://cloud.google.com/pubsub/docs/overview)) with the type of action that was taken along with the relevant ids for the affected resources. This allows api calls to trigger potentially long running tasks without waiting for them to finish before returning it's data to the user. It also lets us decouple what service is emitting the events vs responding to them in a world where we have multi-node clusters of (potentially) many microservices. See `backend/services/pubSubService.ts` and the code that imports it for implementation details.

## Websocket Server
Anytime a user is logged into the app and the app is in the foreground a websocket connection is maintained so that they can have realtime updates pushed to the user without them having to do anything. Note: after ~30 seconds of the app in the background or whenever the app is killed, the websocket connection is severed and does not get events it missed when it recoonects. GCP has a [limit](https://cloud.google.com/run/docs/triggering/websockets#:~:text=Since%20Cloud%20Run%20supports%20concurrent,the%20load%20with%20given%20resources.) on the number of socket connections it allows per vm so to allow scaling of concurrent connected users, we use a redis based websocket [adapter](https://socket.io/docs/v4/redis-adapter/) to handle emiiting events to a user connected on a different node in the cluster. See `backend/services/socketService.ts` for implementation details.

## UI Updates from System Events
When a System Event is ingested, it is translated into a UI Update event and sent, via websockets, to all relevent users that have an active websocket connection at that time. If an update needs to be sent to a user even when their app is in a background state or killed, we send a UI Update Event wrapped in a notification. See `backend/uiUpdateService.ts` for how the `socketService` and `pubSubService` are connected.

# Important files
- config.ts: define what secret/config is needed
- server.ts: sets up configuration for plugins (redis websocket adapter, cron jobs, mongoose etc.)
- auth.ts: defines code to create/validate refresh/access tokens
- controllers/.*: define all the http apis
- services/.*: injectable helpers that are in charge of some domain of the backend
- models/.*: defines [Mongoose](https://mongoosejs.com/) schemas for db