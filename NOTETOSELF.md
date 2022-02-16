<!-- JEN MEI:
- encryption at rest (raheem holds keys so two levels of security)
- e2e encryption
    - for just chat
    - other data?
        - if users hold the keys how do they distribute/rotate them?
        - how does this restrict us being able to validate/mutate e2e encrypted payloads?...we'd have to blindly trust the api call




https://www.preveil.com
https://github.com/etesync/server
https://tatum.io/kms.html
https://github.com/keybase
https://github.com/vector-im
https://en.wikipedia.org/wiki/Shamir%27s_Secret_Sharing 
https://github.com/signalapp/libsignal-client
https://www.asterisk.org/
-->


<!-- 
People who want to help:
- Jen Mei
- diallobcode@gmail.com
- Noobianlabs@gmail.com 

Projects: 
- E2E tests
- generate userfacing documentation for the app integrated into the code
- E2E encryption chat implementation  
- exploration into solving having access to data longterm securely
-->

JM
    - lets talk data export/archive
    - System Data vs Org Data vs Sensitive Data
        - System data is never sent to a client...only, potentially, from client to server...ie auth etag, push token
            - encrypted @ rest w/ Raheem holding the keys
        - Org data is everything that defines the inner workings of an org...ie settings, user profiles, team member mappings, shifts, roles, etc
            - encrypted @ rest w/ Raheem holding the keys
        - Sensitive data is anything that could contain info on 'customers' of the orgs OR ephemeral data that is needed to serve those 'customers' ie. all request data, chat data, live team member location data
            - E2E encrypted with policy that you either have to export or archive it after x time period (not all data ie live team location data)
    - key maanagement
        - users gen keys clientside and publish a public key that every other user picks up when they log in 
        - keys corresponding to archived data older than XTIME are deleted (on non admin users) so users don't have access to old sensitive data after XTIME
        - "request access" from an admin asks for them to send you the most up to date list of keys so you can see everything within this XTIMEBLOCK (back to the last time your keys were deleted and moving forward)
            - we can securely send these via notifications in the background by using the public keys
        - admin can also wipe keys remotely to essentially lock other phones out of sensitive data
    - archiving sensitive data
        - as sensitive data is encrypted (client side) and sent to other clients, tha backend holds a v dumb copy for YTIME to give admins/exporters a chance to export to somewhere else
            - could have this storage be client side as well but issue with syncing
        - all sensitive data delets after YTIME
        - format
            - how configurable?
            - raw data?
            - export where?...especially if we only have these on phones...desktop client works better here
            - anon aggregate data might only be calculatable on the client side if data it needs is E2E encrypted
    
                


TODO: 
- standup prod
- create build pipeline for prod
- create build defs for publishing to staging/prod
- frontend readme








getting ready for people to collab in our codebase
    - test fresh install

    - git flow cleanup ie. feature branch > staging (integration) > production OR hotfix > production > (rebase?) staging
        - define flows 
        - add rules to github repos to enforce
    - followup w/ tev'n / looking for other leads
using websocket implementation to have realtime updates working in app
    - send refresh token to be stored on socket
    - when event occurs (like editing a request, put an event on the service bus
      saying what changed and what users should be notified then return the http res 
    - bus listener then validates the refresh token of each user before pushing them an update through their socket (this covers timeouts and
      remote forced logouts + doesn't slow down http calls)
planning next steps for infra/features
    - scalable multi-node cluster architecture w/ websocket support
        - socket servers share state through redis cache
        - service bus impl for initiating/reacting to events on different nodes


TIMELINE:
THIS WEEK:
- Me: 
    - patch events on backend + websocket ui updates
    - document + test + smooth out dev setup 

WEEK 1
- Tev'n (20 hrs): getting local env setup + Q/A bugs to introduce to codebase
- Me: infrastructure normalization (prod/staging env for backend and frontend, db migrations, etc)
WEEK 2
- Tev'n (20 hrs): more Q/A bugs 
- Me: 
    - start of unit test pattern (stores)
    - setup unit tests with ci/cd (failed tests should prevent merging to integration)
    - start secret rotation code
    - give feedback on feature work (shifts/resources/unknown?)
WEEK 3
- Tev'n (30 hrs): 
    - Q/A Bugs + Store unit tests
    - give feedback on feature work (shifts/resources/unknown?)
- Me: 
    - give feedback on feature work (shifts/resources/unknown?)
    - finish secret rotation code + process + documentation
WEEK 4
- Tev'n (30 hrs): Feature work
- Me: Feature work
WEEK 5
- Tev'n (30 hrs): Feature work
- Me: Feature work
WEEK 6
- Tev'n (30 hrs): Feature work
- Me: Feature work
WEEK 7
- Tev'n (40 hrs): Feature work
- Me: Feature work
WEEK 8
- Tev'n (40 hrs): Feature work
- Me: Feature work
WEEK 9
- Tev'n (40 hrs): Q/A 
- Me: Q/A
WEEK 10
- Tev'n (40 hrs): Q/A
- Me: Q/A




# BUILD PIPELINE

feature/bug branches: build.json
    - prefix: 'tmp-'
    - Trigger: build on push
        - build involves unit tests in docker container
        - tag + push tmp-<branch_with_dashes>
            - use to cache when branch updated
    - gc.sh should delete any tmp image older than 3 days
    
staging: build_deploy.json
    - failed tmp branch build blocks merge
    - prefix: 'rc-'
    - Trigger: build/deploy on merge (filter pull request webhook trigger on action being 'closed' and merged being true)
        - use tmp-<branch_with_dashes> to cache from but do a full build otherwise
        - tag + push rc-<commit_hash>
        - backend
        - frontend (to staging release-channel) if changed

prod: release.json
    - trigger: manual
    - choose the rc you want and send it to the build
    - retag + push the rc to release-<commit_hash> 
    - deploy backend
        - on success publish frontend to release channel
        - on success merge staging rc branch into master


# VANTA
- secure dev policy
https://docs.google.com/document/d/1o7RsAYCZyCyeYqi5MwNirWOd7kO1vgga/edit#heading=h.1t3h5sf
- not done folder
https://drive.google.com/drive/u/1/folders/13dsC-c02RDq8lWw2TWQ-7Y4ox9VIYBjT