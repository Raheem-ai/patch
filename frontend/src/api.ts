import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { User, Location, Me, Organization, UserRole, MinOrg, BasicCredentials, MinUser, ResponderRequestStatuses, ChatMessage, HelpRequest, MinHelpRequest, ProtectedUser, HelpRequestFilter, AuthTokens, AppSecrets, PendingUser, RequestSkill, OrganizationMetadata, Role, MinRole, Attribute, MinAttribute, AttributeCategory, MinAttributeCategory, TagCategory, MinTag, MinTagCategory, Tag, AttributeCategoryUpdates, TagCategoryUpdates, CategorizedItemUpdates, AdminEditableUser, AttributesMap, CategorizedItem } from '../../common/models';
import API, { ClientSideFormat, OrgContext, RequestContext, TokenContext } from '../../common/api';
import { Service } from './services/meta';
import { IAPIService } from './services/interfaces';
import { securelyPersistent } from './meta';
import { IUserStore, userStore } from './stores/interfaces';
import { navigateTo } from './navigation';
import { routerNames } from './types';
import { makeAutoObservable, runInAction } from 'mobx';
import { AtLeast } from '../../common';
import * as Constants from 'expo-constants'
import { runningOnDev, runningOnProd, runningOnStaging } from './utils';

// TODO: the port and non local host need to come from config somehow
// let apiHost = !!manifest && (typeof manifest.packagerOpts === `object`) && manifest.packagerOpts.dev
//   ? manifest.debuggerHost && ('http://' + manifest.debuggerHost.split(`:`)[0].concat(`:9000`))
// //   : 'http://localhost:9000'//`TODO: <prod/staging api>`;
//   : '';
export let apiHost = runningOnProd
    ? 'https://patch-api-staging-y4ftc4poeq-uc.a.run.app'  // TODO: update when we have prod env
    : runningOnStaging 
        ? 'https://patch-api-staging-y4ftc4poeq-uc.a.run.app' 
        : runningOnDev // it's always default in expo go
            ? Constants.default.manifest.extra.devUrl // put dev url here
            : '' // what should be the default for an unknown release channel? 

if (!apiHost) {
    // do something?
}

@Service(IAPIService)
export class APIClient implements IAPIService {
    
    // TODO: move accessToken here?

    @securelyPersistent()
    refreshToken: string = null;

    constructor() {
        makeAutoObservable(this)
    }

    clear() {
        this.refreshToken = null;
    }

    private async tryPost<T>(url: string, body: any, config: AxiosRequestConfig) {
        try {
            return await axios.post<T>(url, body, config);
        } catch (e) {
            const error = e as AxiosError;
            const status = error?.response?.status;

            const errorName = error?.response?.data?.name;

            // we're already signed in and the error is auth based
            const isAuthError = (!!status && (status == 401 || status == 403)) || errorName == 'AuthenticationError';
            const shouldRetry = !!this.refreshToken && isAuthError;

            if (!shouldRetry) {
                // in case refreshToken gets corrupted (should just show up in testing)
                if (isAuthError) {
                    navigateTo(routerNames.signIn)
                    userStore().clear()
                }

                throw error;
            }

            let accessToken;

            try {
                accessToken = await this.refreshAuth(this.refreshToken);
            } catch (e) {
                // clear user store and reroute to signin
                runInAction(() => {
                    this.refreshToken = null;
                })
                
                navigateTo(routerNames.signIn)

                userStore().clear()

                throw 'User no longer signed in'
            }

            const updatedConfig = {
                ...config,
                ...{
                    headers: {
                        ...config.headers,
                        ...this.userScopeAuthHeaders({ token: accessToken })
                    }
                }
            };

            runInAction(() => {
                // update accessToken for later calls
                userStore().authToken = accessToken
            })

            return await axios.post<T>(url, body, updatedConfig);
        }
    }

    private async tryGet<T>(url: string, config: AxiosRequestConfig) {
        try {
            return await axios.get<T>(url, config);
        } catch (e) {
            const error = e as AxiosError;
            const status = error?.response?.status;

            const errorName = error?.response?.data?.name;

            // we're already signed in and the error is auth based
            const isAuthError = (!!status && (status == 401 || status == 403)) || errorName == 'AuthenticationError';
            const shouldRetry = !!this.refreshToken && isAuthError;

            if (!shouldRetry) {
                // in case refreshToken gets corrupted (should just show up in testing)
                if (isAuthError) {
                    navigateTo(routerNames.signIn)
                    userStore().clear()
                }

                throw error;
            }

            let accessToken;

            try {
                accessToken = await this.refreshAuth(this.refreshToken);
            } catch (e) {
                // clear user store and reroute to signin
                runInAction(() => {
                    this.refreshToken = null;
                })
                
                navigateTo(routerNames.signIn)

                userStore().clear()

                throw 'User no longer signed in'
            }

            const updatedConfig = {
                ...config,
                ...{
                    headers: {
                        ...config.headers,
                        ...this.userScopeAuthHeaders({ token: accessToken })
                    }
                }
            };

            runInAction(() => {
                // update accessToken for later calls
                userStore().authToken = accessToken
            })

            return await axios.get<T>(url, updatedConfig);
        }
    }
    
    // unauthorized apis
    async signIn(credentials: BasicCredentials): Promise<AuthTokens> {
        const url = `${apiHost}${API.client.signIn()}`;

        const tokens = (await axios.post<AuthTokens>(url, { credentials })).data

        runInAction(() => {
            this.refreshToken = tokens.refreshToken;
        })

        return tokens;
    }

    async signUp(user: MinUser): Promise<AuthTokens> {
        const url = `${apiHost}${API.client.signUp()}`;

        const tokens = (await axios.post<AuthTokens>(url, { user })).data

        runInAction(() => {
            this.refreshToken = tokens.refreshToken;
        })

        return tokens;
    }

    async signUpThroughOrg(orgId: string, pendingId: string, user: MinUser): Promise<AuthTokens> {
        const url = `${apiHost}${API.client.signUpThroughOrg()}`;

        const tokens = (await axios.post<AuthTokens>(url, { 
            orgId, 
            pendingId,
            user
        })).data

        runInAction(() => {
            this.refreshToken = tokens.refreshToken;
        })

        return tokens;
    }

    async refreshAuth(refreshToken: string): Promise<string> {
        const url = `${apiHost}${API.client.refreshAuth()}`;

        const accessToken = (await axios.post<string>(url, { refreshToken })).data

        return accessToken;
    }

    // user scoped apis

    async getSecrets(ctx: TokenContext): Promise<AppSecrets> {
        const url = `${apiHost}${API.client.getSecrets()}`;

        const secrets = (await this.tryGet<AppSecrets>(url, {
            headers: this.userScopeAuthHeaders(ctx),
        })).data

        return secrets;
    }

    async me(ctx: TokenContext): Promise<ClientSideFormat<Me>> {
        const url = `${apiHost}${API.client.me()}`;

        const user = (await this.tryPost<ClientSideFormat<Me>>(url, {}, {
            headers: this.userScopeAuthHeaders(ctx),
        })).data

        return user;
    }

    async editMe(ctx: OrgContext, me: Partial<Me>, protectedUser?: Partial<AdminEditableUser>): Promise<ClientSideFormat<Me>> {
        const url = `${apiHost}${API.client.editMe()}`;

        return (await this.tryPost<ClientSideFormat<Me>>(url, {
            me,
            protectedUser
        }, {
            headers: this.orgScopeAuthHeaders(ctx),
        })).data
    }

    async signOut(ctx: TokenContext) {
        const url = `${apiHost}${API.client.signOut()}`;

        await this.tryPost(url, {}, {
            headers: this.userScopeAuthHeaders(ctx),
        });
    }

    async reportLocation(ctx: TokenContext, locations: Location[]) {
        const url = `${apiHost}${API.client.reportLocation()}`;

        await this.tryPost<User>(url, {            
            locations
        }, {
            headers: this.userScopeAuthHeaders(ctx),
        })
    }

    async reportPushToken(ctx: TokenContext, token: string) {
        const url = `${apiHost}${API.client.reportPushToken()}`;

        await this.tryPost<void>(url, {            
            token
        }, {
            headers: this.userScopeAuthHeaders(ctx),
        })
    }

    async createOrg(ctx: TokenContext, org: MinOrg) {
        const url = `${apiHost}${API.client.createOrg()}`;

        return (await this.tryPost<{ user: User, org: Organization }>(url, {            
            org
        }, {
            headers: this.userScopeAuthHeaders(ctx),
        })).data
    }

    // org scoped apis

    async getOrgMetadata(ctx: OrgContext): Promise<OrganizationMetadata> {
        const url = `${apiHost}${API.client.getOrgMetadata()}`;
        return (await this.tryGet<OrganizationMetadata>(url, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async editOrgMetadata(ctx: OrgContext, orgUpdates: Partial<OrganizationMetadata>): Promise<OrganizationMetadata> {
        const url = `${apiHost}${API.client.editOrgMetadata()}`;

        return (await this.tryPost<OrganizationMetadata>(url, { orgUpdates } ,{
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async editRole(ctx: OrgContext, roleUpdates: AtLeast<Role, 'id'>): Promise<Role> {
        const url = `${apiHost}${API.client.editRole()}`;

        return (await this.tryPost<Role>(url, { roleUpdates } ,{
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async deleteRoles(ctx: OrgContext, roleIds: string[]): Promise<OrganizationMetadata> {
        const url = `${apiHost}${API.client.deleteRoles()}`;

        return (await this.tryPost<OrganizationMetadata>(url, { roleIds } ,{
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async createNewRole(ctx: OrgContext, role: MinRole): Promise<Role> {
        const url = `${apiHost}${API.client.createNewRole()}`;

        return (await this.tryPost<Role>(url, {
            role
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }
    
    async updateAttributes(ctx: OrgContext, updates: CategorizedItemUpdates): Promise<OrganizationMetadata> {
        const url = `${apiHost}${API.client.updateAttributes()}`;

        return (await this.tryPost<OrganizationMetadata>(url, {
            updates
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async createNewAttributeCategory(ctx: OrgContext, category: MinAttributeCategory): Promise<AttributeCategory> {
        const url = `${apiHost}${API.client.createNewAttributeCategory()}`;

        return (await this.tryPost<AttributeCategory>(url, {
            category
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async editAttributeCategory(ctx: OrgContext, categoryUpdates: AttributeCategoryUpdates): Promise<AttributeCategory> {
        const url = `${apiHost}${API.client.editAttributeCategory()}`;

        return (await this.tryPost<AttributeCategory>(url, {
            categoryUpdates
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async deleteAttributeCategory(ctx: OrgContext, categoryId: string): Promise<OrganizationMetadata> {
        const url = `${apiHost}${API.client.deleteAttributeCategory()}`;

        return (await this.tryPost<OrganizationMetadata>(url, { 
            categoryId
        } , {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async createNewAttribute(ctx: OrgContext, categoryId: string, attribute: MinAttribute): Promise<Attribute> {
        const url = `${apiHost}${API.client.createNewAttribute()}`;

        return (await this.tryPost<Attribute>(url, {
            categoryId,
            attribute
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }
    
    async editAttribute(ctx: OrgContext, categoryId: string, attributeUpdates: AtLeast<Attribute, 'id'>): Promise<Attribute> {
        const url = `${apiHost}${API.client.editAttribute()}`;

        return (await this.tryPost<Attribute>(url, {
            categoryId,
            attributeUpdates
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async deleteAttribute(ctx: OrgContext, categoryId: string, attributeId: string): Promise<OrganizationMetadata> {
        const url = `${apiHost}${API.client.deleteAttribute()}`;

        return (await this.tryPost<OrganizationMetadata>(url, {
            categoryId,
            attributeId
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async updateTags(ctx: OrgContext, updates: CategorizedItemUpdates): Promise<OrganizationMetadata> {
        const url = `${apiHost}${API.client.updateTags()}`;

        return (await this.tryPost<OrganizationMetadata>(url, {
            updates
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async createNewTagCategory(ctx: OrgContext, category: MinTagCategory): Promise<TagCategory> {
        const url = `${apiHost}${API.client.createNewTagCategory()}`;

        return (await this.tryPost<TagCategory>(url, {
            category
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async editTagCategory(ctx: OrgContext, categoryUpdates: TagCategoryUpdates): Promise<TagCategory> {
        const url = `${apiHost}${API.client.editTagCategory()}`;

        return (await this.tryPost<TagCategory>(url, {
            categoryUpdates
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async deleteTagCategory(ctx: OrgContext, categoryId: string): Promise<OrganizationMetadata> {
        const url = `${apiHost}${API.client.deleteTagCategory()}`;

        return (await this.tryPost<OrganizationMetadata>(url, { 
            categoryId
        } , {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async createNewTag(ctx: OrgContext, categoryId: string, tag: MinTag): Promise<Tag> {
        const url = `${apiHost}${API.client.createNewTag()}`;

        return (await this.tryPost<Tag>(url, {
            categoryId,
            tag
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async editTag(ctx: OrgContext, categoryId: string, tagUpdates: AtLeast<Tag, 'id'>): Promise<Tag> {
        const url = `${apiHost}${API.client.editTag()}`;

        return (await this.tryPost<Tag>(url, {
            categoryId,
            tagUpdates
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async deleteTag(ctx: OrgContext, categoryId: string, tagId: string): Promise<OrganizationMetadata> {
        const url = `${apiHost}${API.client.deleteTag()}`;

        return (await this.tryPost<OrganizationMetadata>(url, {
            categoryId,
            tagId
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async broadcastRequest(ctx: OrgContext, requestId: string, to: string[]) {
        const url = `${apiHost}${API.client.broadcastRequest()}`;

        await this.tryPost<void>(url, {
            requestId,
            to
        }, {
            headers: this.orgScopeAuthHeaders(ctx),
        });
    }

    async notifyRespondersAboutRequest(ctx: OrgContext, requestId: string, to: string[]) {
        const url = `${apiHost}${API.client.notifyRespondersAboutRequest()}`;

        return (await this.tryPost<HelpRequest>(url, {
            requestId,
            to
        }, {
            headers: this.orgScopeAuthHeaders(ctx),
        })).data;
    }

    async ackRequestNotification(ctx: OrgContext, requestId: string) {
        const url = `${apiHost}${API.client.notifyRespondersAboutRequest()}`;

        return (await this.tryPost<HelpRequest>(url, {
            requestId
        }, {
            headers: this.orgScopeAuthHeaders(ctx),
        })).data;
    }

    async setOnDutyStatus(ctx: OrgContext, onDuty: boolean) {
        const url = `${apiHost}${API.client.setOnDutyStatus()}`;

        return (await this.tryPost<ClientSideFormat<Me>>(url, {
            onDuty
        }, {
            headers: this.orgScopeAuthHeaders(ctx),
        })).data;
    }

    async ackRequestToJoinNotification(ctx: OrgContext, requestId: string, userId: string, positionId: string) {
        const url = `${apiHost}${API.client.ackRequestToJoinNotification()}`;

        return (await this.tryPost<HelpRequest>(url, {
            requestId,
            userId,
            positionId
        }, {
            headers: this.orgScopeAuthHeaders(ctx),
        })).data;
    }

    async confirmRequestToJoinRequest(ctx: OrgContext, requestId: string) {
        const url = `${apiHost}${API.client.confirmRequestToJoinRequest()}`;

        return (await this.tryPost<HelpRequest>(url, {
            requestId
        }, {
            headers: this.orgScopeAuthHeaders(ctx),
        })).data;
    }

    async declineRequestToJoinRequest(ctx: OrgContext, requestId: string) {
        const url = `${apiHost}${API.client.declineRequestToJoinRequest()}`;

        return (await this.tryPost<HelpRequest>(url, {
            requestId
        }, {
            headers: this.orgScopeAuthHeaders(ctx),
        })).data;
    }

    async joinRequest(ctx: OrgContext, requestId: string, positionId: string): Promise<HelpRequest> {
        const url = `${apiHost}${API.client.joinRequest()}`;

        return (await this.tryPost<HelpRequest>(url, {
            requestId,
            positionId
        }, {
            headers: this.orgScopeAuthHeaders(ctx),
        })).data;
    }

    async requestToJoinRequest(ctx: OrgContext, requestId: string, positionId: string): Promise<HelpRequest> {
        const url = `${apiHost}${API.client.requestToJoinRequest()}`;

        return (await this.tryPost<HelpRequest>(url, {
            requestId,
            positionId
        }, {
            headers: this.orgScopeAuthHeaders(ctx),
        })).data;
    }

    async leaveRequest(ctx: OrgContext, requestId: string, positionId: string): Promise<HelpRequest> {
        const url = `${apiHost}${API.client.leaveRequest()}`;

        return (await this.tryPost<HelpRequest>(url, {
            requestId,
            positionId
        }, {
            headers: this.orgScopeAuthHeaders(ctx),
        })).data;
    }

    async removeUserFromRequest(ctx: OrgContext, userId: string, requestId: string, positionId: string): Promise<HelpRequest> {
        const url = `${apiHost}${API.client.removeUserFromRequest()}`;

        return (await this.tryPost<HelpRequest>(url, {
            requestId,
            userId,
            positionId
        }, {
            headers: this.orgScopeAuthHeaders(ctx),
        })).data;
    }
    
    async inviteUserToOrg(ctx: OrgContext, email: string, phone: string, roles: UserRole[], roleIds: string[], attributes: CategorizedItem[], skills: RequestSkill[], baseUrl: string) {
        const url = `${apiHost}${API.client.inviteUserToOrg()}`;

        return (await this.tryPost<PendingUser>(url, {
            email,
            phone,
            roles,
            roleIds,
            attributes,
            baseUrl,
            skills
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async editUser(ctx: OrgContext, userId: string, user: Partial<AdminEditableUser>): Promise<ClientSideFormat<ProtectedUser>> {
        const url = `${apiHost}${API.client.editUser()}`;

        return (await this.tryPost<ClientSideFormat<ProtectedUser>>(url, {
            user,
            userId
        }, {
            headers: this.orgScopeAuthHeaders(ctx),
        })).data
    }

    async addUserToOrg(ctx: OrgContext, userId: string, roles: UserRole[]) {
        const url = `${apiHost}${API.client.addUserToOrg()}`;

        return (await this.tryPost<{ user: User, org: Organization }>(url, {
            userId,
            roles
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async removeUserFromOrg(ctx: OrgContext, userId: string) {
        const url = `${apiHost}${API.client.removeUserFromOrg()}`;

        return (await this.tryPost<{ user: User, org: Organization }>(url, {
            userId
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async removeUserRoles(ctx: OrgContext, userId: string, roles: UserRole[]) {
        const url = `${apiHost}${API.client.removeUserRoles()}`;

        return (await this.tryPost<User>(url, {
            userId,
            roles
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async addUserRoles(ctx: OrgContext, userId: string, roles: UserRole[]) {
        const url = `${apiHost}${API.client.addUserRoles()}`;

        return (await this.tryPost<User>(url, {
            userId,
            roles
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async addRolesToUser(ctx: OrgContext, userId: string, roles: string[]) {
        const url = `${apiHost}${API.client.addRolesToUser()}`;

        return (await this.tryPost<User>(url, {
            userId,
            roles
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }


    async getTeamMembers(ctx: OrgContext, userIds?: string[]): Promise<ProtectedUser[]> {
        const url = `${apiHost}${API.client.getTeamMembers()}`;

        return (await this.tryPost<ProtectedUser[]>(url, {
            userIds
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async getRespondersOnDuty(ctx: OrgContext): Promise<ProtectedUser[]> {
        const url = `${apiHost}${API.client.getRespondersOnDuty()}`;

        return (await this.tryGet<ProtectedUser[]>(url, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async createNewRequest(ctx: OrgContext, request: MinHelpRequest): Promise<HelpRequest> {
        const url = `${apiHost}${API.client.createNewRequest()}`;

        return (await this.tryPost<HelpRequest>(url, {
            request
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async getRequests(ctx: OrgContext, requestIds?: string[]): Promise<HelpRequest[]> {
        const url = `${apiHost}${API.client.getRequests()}`;

        return (await this.tryPost<HelpRequest[]>(url, {
            requestIds
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async getRequest(ctx: OrgContext, requestId: string): Promise<HelpRequest> {
        const url = `${apiHost}${API.client.getRequest()}`;

        return (await this.tryGet<HelpRequest>(url, {
            headers: this.requestScopeAuthHeaders({ ...ctx, requestId })
        })).data
    }

    async editRequest(ctx: OrgContext, requestUpdates: AtLeast<HelpRequest, 'id'>): Promise<HelpRequest> {
        const url = `${apiHost}${API.client.editRequest()}`;

        return (await this.tryPost<HelpRequest>(url, { requestUpdates } ,{
            headers: this.requestScopeAuthHeaders({ ...ctx, requestId: requestUpdates.id })
        })).data
    }

    async unAssignRequest(ctx: RequestContext, userId: string): Promise<void> {
        const url = `${apiHost}${API.client.unAssignRequest()}`;

        await this.tryPost<void>(url, {
            userId
        }, {
            headers: this.requestScopeAuthHeaders(ctx)
        })
    }

    async sendChatMessage(ctx: RequestContext, message: string): Promise<HelpRequest> {
        const url = `${apiHost}${API.client.sendChatMessage()}`;

        return (await this.tryPost<HelpRequest>(url, {
            message
        }, {
            headers: this.requestScopeAuthHeaders(ctx)
        })).data
    }

    async setRequestStatus(ctx: RequestContext, status: ResponderRequestStatuses): Promise<HelpRequest> {
        const url = `${apiHost}${API.client.setRequestStatus()}`;

        return (await this.tryPost<HelpRequest>(url, {
            status
        }, {
            headers: this.requestScopeAuthHeaders(ctx)
        })).data
    }

    async resetRequestStatus(ctx: RequestContext): Promise<HelpRequest> {
        const url = `${apiHost}${API.client.resetRequestStatus()}`;

        return (await this.tryPost<HelpRequest>(url, {}, {
            headers: this.requestScopeAuthHeaders(ctx)
        })).data
    }

    async updateRequestChatReceipt(ctx: RequestContext, lastMessageId: number): Promise<HelpRequest> {
        const url = `${apiHost}${API.client.updateRequestChatReceipt()}`;

        return (await this.tryPost<HelpRequest>(url, {
            lastMessageId
        }, {
            headers: this.requestScopeAuthHeaders(ctx)
        })).data
    }

    userScopeAuthHeaders(ctx: TokenContext) {
        return {
            'Authorization': `Bearer ${ctx.token}`
        }
    }

    orgScopeAuthHeaders(ctx: OrgContext) {
        const headers = this.userScopeAuthHeaders(ctx);
        headers[API.orgIdHeader] = ctx.orgId;

        return headers;
    }

    requestScopeAuthHeaders(ctx: RequestContext) {
        const headers = this.orgScopeAuthHeaders(ctx);
        headers[API.requestIdHeader] = ctx.requestId;

        return headers;
    }
}