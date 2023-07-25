import { Inject, Service } from "@tsed/di";
import { UserDoc, UserModel } from "../models/user";
import { OrganizationModel } from "../models/organization";
import { MongooseService } from "@tsed/mongoose";
import { Document, Model } from "mongoose";
import { HelpRequestDoc, HelpRequestModel } from "../models/helpRequest";
import { AuthCodeModel } from "../models/authCode";

import { DBManager } from "../common/dbManager";
import { DynamicConfigModel } from "../models/dynamicConfig";
import { Agenda, Every } from "@tsed/agenda";
import { DefaultAttributeCategories, DefaultAttributeCategoryIds, DefaultRoleIds, MinHelpRequest, Position, RequestStatus, RequestType } from "common/models";

// NOTE: any jobs used for testing etc. need to be defined here vs DBManager directly
@Agenda()
@Service()
export class DBManagerService extends DBManager {
    constructor(
        @Inject(MongooseService) db: MongooseService,
        @Inject(UserModel) users: Model<UserModel>,
        @Inject(OrganizationModel) orgs: Model<OrganizationModel>,
        @Inject(HelpRequestModel) requests: Model<HelpRequestModel>,
        @Inject(AuthCodeModel) authCodes: Model<AuthCodeModel>,
        @Inject(DynamicConfigModel) dynamicConfig: Model<DynamicConfigModel>,
    ) {
        super(db.get(), users, orgs, requests, authCodes, dynamicConfig)
    }

    // @Every('5 minutes', { name: `Repopulating` })
    async rePopulateDb() {
        try {
            const oldUsers = await this.getUsers({});
            const oldRequests = await this.getRequests({});
            const oldOrgs = await this.getOrganizations({});

            console.log('deleting old users')
            await this.bulkDelete(this.users, oldUsers);

            console.log('deleting old requests')
            await this.bulkDelete(this.requests, oldRequests);

            console.log('deleting old organizations')
            await this.bulkDelete(this.orgs, oldOrgs);

            console.log('creating users/org')

            let user1 = await this.createUser({ 
                email: 'Charlie@test.com', 
                password: 'Test', 
                displayColor: "#25db00",
                name: "Charlie Lipford",
                race: "nunya",
                phone: "8045166822",
                // skills: [ RequestSkill.CPR, RequestSkill.ConflictResolution, RequestSkill.MentalHealth ]
            });

            let [ org, admin1 ] = await this.createOrganization({
                name: 'Community Response Program'
            }, user1.id);


            let user2 = await this.createUser({ 
                email: 'Nadav@test.com', 
                password: 'Test',
                name: 'Nadav Savio',
            });

            let user3 = await this.createUser({ 
                email: 'Cosette@test.com', 
                password: 'Test',
                name: 'Cosette Ayele',
            });

            let user4 = await this.createUser({ 
                email: 'Tevn@test.com', 
                password: 'Test',
                name: `Tev'n Powers`,
            });

            let userAdmin = await this.createUser({ 
                email: 'admin@test.com', 
                password: 'Test',
                name: 'Admin',
            });

            let userDispatcher = await this.createUser({ 
                email: 'dispatcher@test.com', 
                password: 'Test',
                name: 'Dispatcher',
            });

            let userResponder = await this.createUser({ 
                email: 'responder@test.com', 
                password: 'Test',
                name: 'Responder',
            });

            let user5 = await this.createUser({ 
                email: 'Tevn2@test.com', 
                password: 'Test',
                name: 'Tevy Tev2',
            });

            [ org, user2 ] = await this.addUserToOrganization(org, user2, [], []);
            [ org, user3 ] = await this.addUserToOrganization(org, user3, [], []);
            [ org, user4 ] = await this.addUserToOrganization(org, user4, [], []);
            [ org, user5 ] = await this.addUserToOrganization(org, user5, [], []);
            [ org, userAdmin ] = await this.addUserToOrganization(org, userAdmin, [], []);
            [ org, userDispatcher ] = await this.addUserToOrganization(org, userDispatcher, [], []);
            [ org, userResponder ] = await this.addUserToOrganization(org, userResponder, [], []);

            user1 = await this.addRolesToUser(org.id, user1.id, [ DefaultRoleIds.Dispatcher, DefaultRoleIds.Responder ])
            user2 = await this.addRolesToUser(org.id, user2.id, [ DefaultRoleIds.Admin, DefaultRoleIds.Dispatcher, DefaultRoleIds.Responder ])
            user3 = await this.addRolesToUser(org.id, user3.id, [ DefaultRoleIds.Admin, DefaultRoleIds.Dispatcher, DefaultRoleIds.Responder ])
            user4 = await this.addRolesToUser(org.id, user4.id, [ DefaultRoleIds.Admin, DefaultRoleIds.Dispatcher, DefaultRoleIds.Responder ]);

            // TODO: update this population code 
            // let trainingsAttribute: AttributeCategory, 
            //     cprAttribute: Attribute, 
            //     firstAidAttribute: Attribute,
            //     copWatchAttribute: Attribute;

            // let languageAttribute: AttributeCategory, 
            //     spanishAttribute: Attribute, 
            //     japaneseAttribute: Attribute,
            //     swahiliAttribute: Attribute;

            // [org, trainingsAttribute] = await this.addAttributeCategoryToOrganization(org.id, {
            //     name: 'Trainings'
            // });

            // [org, cprAttribute] = await this.addAttributeToOrganization(org.id, trainingsAttribute.id, {
            //     name: 'CPR'
            // });

            // [org, firstAidAttribute] = await this.addAttributeToOrganization(org.id, trainingsAttribute.id, {
            //     name: 'First Aid'
            // });

            // [org, copWatchAttribute] = await this.addAttributeToOrganization(org.id, trainingsAttribute.id, {
            //     name: 'Cop Watch'
            // });

            // [org, languageAttribute] = await this.addAttributeCategoryToOrganization(org.id, {
            //     name: 'Languages'
            // });

            // [org, spanishAttribute] = await this.addAttributeToOrganization(org.id, languageAttribute.id, {
            //     name: 'Spanish'
            // });

            // [org, japaneseAttribute] = await this.addAttributeToOrganization(org.id, languageAttribute.id, {
            //     name: 'Japanese'
            // });

            // [org, swahiliAttribute] = await this.addAttributeToOrganization(org.id, languageAttribute.id, {
            //     name: 'Swahili'
            // });

            // let weaponCategory: TagCategory, 
            //     gunTag: Tag, 
            //     knifeTag: Tag,
            //     molotovTag: Tag;

            // [org, weaponCategory] = await this.addTagCategoryToOrganization(org.id, {
            //     name: 'Weapons'
            // });

            // [org, gunTag] = await this.addTagToOrganization(org.id, weaponCategory.id, {
            //     name: 'Gun'
            // });

            // [org, knifeTag] = await this.addTagToOrganization(org.id, weaponCategory.id, {
            //     name: 'Knife'
            // });

            // [org, molotovTag] = await this.addTagToOrganization(org.id, weaponCategory.id, {
            //     name: 'Molotov cocktail'
            // });

            console.log('Assigning attributes to users');

            // const allAttributes: CategorizedItem[] = [
            //     { categoryId: trainingsAttribute.id, itemId: cprAttribute.id },
            //     { categoryId: trainingsAttribute.id, itemId: firstAidAttribute.id },
            //     { categoryId: trainingsAttribute.id, itemId: copWatchAttribute.id },

            //     { categoryId: languageAttribute.id, itemId: spanishAttribute.id },
            //     { categoryId: languageAttribute.id, itemId: swahiliAttribute.id },
            //     { categoryId: languageAttribute.id, itemId: japaneseAttribute.id },
            // ]

            // user1 = await this.updateUser(org.id, user1, {
            //     attributes: allAttributes.slice(2, 4)
            // })

            // user2 = await this.updateUser(org.id, user2, {
            //     attributes: allAttributes.slice(0, 1)
            // })

            // user3 = await this.updateUser(org.id, user3, {
            //     attributes: allAttributes.slice(0, -2)
            // })

            // user4 = await this.updateUser(org.id, user4, {
            //     attributes: allAttributes.slice(4, 5)
            // })

            // user5 = await this.updateUser(org.id, user5, {
            //     attributes: allAttributes.slice(1, 3)
            // })

            const allPositionSetups: Position[] = [
                {
                    id: 'catchall',
                    attributes: [],
                    min: 1,
                    max: -1,
                    role: DefaultRoleIds.Anyone,
                    joinedUsers: []
                },
                {
                    id: 'specific',
                    attributes: [/*{ itemId: cprAttribute.id, categoryId: trainingsAttribute.id }*/],
                    min: 2,
                    max: 2,
                    role: DefaultRoleIds.Responder,
                    joinedUsers: []
                },
                {
                    id: 'dispatcher',
                    attributes: [/*{ itemId: firstAidAttribute.id, categoryId: trainingsAttribute.id }*/],
                    min: 1,
                    max: 3,
                    role: DefaultRoleIds.Dispatcher,
                    joinedUsers: []
                }
            ]

            const minRequests: MinHelpRequest[] = [
                {
                    type: [RequestType.CallerInDanger, RequestType.DirectActionAssistance],
                    location: {
                        latitude: 40.69776419999999,
                        longitude: -73.9303333,
                        address: "960 Willoughby Avenue, Brooklyn, NY, USA"
                    },
                    tagHandles: [/*{ categoryId: weaponCategory.id, itemId: molotovTag.id }*/],
                    positions: allPositionSetups.slice(0, 2),
                    notes: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
                },
                {
                    type: [RequestType.CallerInDanger, RequestType.Fireworks, RequestType.SelfHarming],
                    location: {
                        latitude: 40.70107496314848,
                        longitude: -73.90470642596483,
                        address: "Seneca Av/Cornelia St, Queens, NY 11385, USA"
                    },
                    positions: allPositionSetups.slice(1, 2),
                    notes: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
                },
                {
                    type: [RequestType.CallerInDanger],
                    location: {
                        latitude: 40.70107496314848,
                        longitude: -73.90470642596483,
                        address: "Seneca Av/Cornelia St, Queens, NY 11385, USA"
                    },
                    positions: allPositionSetups.slice(-1),
                    notes: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut',
                },
                {
                    type: [RequestType.Carjacking],
                    location: {
                        latitude: 40.70107496314848,
                        longitude: -73.90470642596483,
                        address: "Seneca Av/Cornelia St, Queens, NY 11385, USA"
                    },
                    positions: allPositionSetups.slice(0, 1),
                    notes: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut',
                    status: RequestStatus.Done
                }
            ];

            const fullReqs: HelpRequestDoc[] = [];
            
            console.log('creating requests')
            for (const req of minRequests) {
                fullReqs.push(await this.createRequest(req, org.id, admin1.id))
            }

            let reqWithMessage = await this.sendMessageToReq(user1, fullReqs[0], 'Message one...blah blah blah')
            reqWithMessage = await this.sendMessageToReq(user2, reqWithMessage, 'Message Two!')
            reqWithMessage = await this.sendMessageToReq(user2, reqWithMessage, 'Message Three!...blah blah blah...blah blah blah blah blah bliggity blah')

            // notify people 
            reqWithMessage = await this.notifyRespondersAboutRequest(reqWithMessage, user1.id, [user2.id, user3.id, user4.id, user5.id])

            // ack notification
            reqWithMessage = await this.ackRequestNotification(reqWithMessage, user2.id);

            // join
            reqWithMessage = await this.joinRequest(org.id, reqWithMessage, user4.id, reqWithMessage.positions[0].id)

            // leave

            // request
            reqWithMessage = await this.requestToJoinRequest(reqWithMessage, user5.id, reqWithMessage.positions[0].id)
            reqWithMessage = await this.requestToJoinRequest(reqWithMessage, user3.id, reqWithMessage.positions[0].id)

            reqWithMessage = await this.requestToJoinRequest(reqWithMessage, user5.id, reqWithMessage.positions[1].id)
            reqWithMessage = await this.requestToJoinRequest(reqWithMessage, user3.id, reqWithMessage.positions[1].id)
            
            // ack request
            reqWithMessage = await this.ackRequestsToJoinNotification(reqWithMessage, user1.id, [
                { userId: user5.id, positionId: reqWithMessage.positions[0].id },
                { userId: user3.id, positionId: reqWithMessage.positions[0].id }
            ])

            // accept
            reqWithMessage =  await this.confirmRequestToJoinPosition(org.id, reqWithMessage, user1.id, user5.id, reqWithMessage.positions[0].id)

            // deny request
            reqWithMessage =  await this.declineRequestToJoinPosition(reqWithMessage, user1.id, user3.id, reqWithMessage.positions[0].id)

            console.log('finished populating')
        } catch (e) {
            console.error(e)
        }
    }

    // @Every('30 seconds', { name: `E2E Test` })
    // async test() {
    //     try {
    //         let user = await this.getUser({ email: 'Test@test.com' });
    //         const helpReq = await this.getRequest({ _id: '6153999a517b7c7d53411e46' });

    //         console.log(await this.sendMessageToReq(user, helpReq, 'testing testing 123'));
            // let user = await this.createUser({ email: 'Test@test.com', password: 'Test' });

            // let [ org, admin ] = await this.createOrganization({
            //     name: 'Foo Org'
            // }, user.id);

            // admin = await this.addUserRoles(org.id, admin, [ UserRole.Dispatcher, UserRole.Responder ]);

            // admin = await this.addUserRoles(org.id, admin, [2, 3, 4, 5])
            // admin = await this.removeUserRoles(org.id, admin, [2, 3])

            // console.log(inspect(admin.toObject(), null, 4));
            // console.log(inspect((await this.getOrganization({ _id: org.id })).toObject(), null, 4));

            // [ org, admin ] = await this.removeUserFromOrganization(org, admin);

            // console.log(inspect([org, admin], null, 5));

            // console.log((await this.getUser({ _id: user.id })).toJSON());
            // console.log((await this.getOrganization({ _id: org.id })).toJSON())

            // await Promise.all([
            //     admin.delete(),
            //     org.delete()
            // ])
    //     } catch (e) {
    //         console.error(e)
    //     }
    // }

}