import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import Constants from "expo-constants";
import { User, Location, Me, Organization, UserRole, MinOrg, BasicCredentials, MinUser, ResponderRequestStatuses, ChatMessage, HelpRequest, MinHelpRequest, ProtectedUser, HelpRequestFilter, AuthTokens } from '../../common/models';
import API, { ClientSideFormat, OrgContext, RequestContext, TokenContext } from '../../common/api';
import { Service } from './services/meta';
import { IAPIService } from './services/interfaces';
import { securelyPersistent } from './meta';
import { getStore } from './stores/meta';
import { IUserStore } from './stores/interfaces';
import { navigateTo } from './navigation';
import { routerNames } from './types';
import { makeAutoObservable, runInAction } from 'mobx';
const { manifest } = Constants;

// TODO: the port and non local host need to come from config somehow
// let apiHost = !!manifest && (typeof manifest.packagerOpts === `object`) && manifest.packagerOpts.dev
//   ? manifest.debuggerHost && ('http://' + manifest.debuggerHost.split(`:`)[0].concat(`:9000`))
// //   : 'http://localhost:9000'//`TODO: <prod/staging api>`;
//   : '';
// let apiHost = 'https://patch-api-staging-y4ftc4poeq-uc.a.run.app' //'http://6e73-24-44-148-246.ngrok.io' 
let apiHost = 'http://0660-179-218-29-159.ngrok.io'

@Service()
export class APIClient implements IAPIService {
    
    private userStore: IUserStore;

    // TODO: move accessToken here?

    @securelyPersistent()
    refreshToken: string;

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        this.userStore = getStore<IUserStore>(IUserStore);
    }

    private async tryPost<T>(url: string, body: any, config: AxiosRequestConfig) {
        try {
            return await axios.post<T>(url, body, config);
        } catch (e) {
            const error = e as AxiosError;
            const status = error?.response?.status;

            // we're already signed in and the error is auth based
            const shouldRetry = !!this.refreshToken 
                && !!status && (status >= 400 && status < 500);

            if (!shouldRetry) {
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

                this.userStore.clear()

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
                this.userStore.authToken = accessToken
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

            // we're already signed in and the error is auth based
            const shouldRetry = !!this.refreshToken 
                && !!status && (status >= 400 && status < 500);

            if (!shouldRetry) {
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

                this.userStore.clear()

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
                this.userStore.authToken = accessToken
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

    async refreshAuth(refreshToken: string): Promise<string> {
        const url = `${apiHost}${API.client.refreshAuth()}`;

        const accessToken = (await axios.post<string>(url, { refreshToken })).data

        return accessToken;
    }

    // user scoped apis

    async me(ctx: TokenContext): Promise<ClientSideFormat<Me>> {
        const url = `${apiHost}${API.client.me()}`;

        const user = (await this.tryPost<ClientSideFormat<Me>>(url, {}, {
            headers: this.userScopeAuthHeaders(ctx),
        })).data

        return user;
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

    async broadcastRequest(ctx: OrgContext, requestId: string, to: string[]) {
        const url = `${apiHost}${API.client.broadcastRequest()}`;

        await this.tryPost<void>(url, {
            requestId,
            to
        }, {
            headers: this.orgScopeAuthHeaders(ctx),
        });
    }

    async assignRequest(ctx: OrgContext, requestId: string, to: string[]) {
        const url = `${apiHost}${API.client.assignRequest()}`;

        await this.tryPost<void>(url, {
            requestId,
            to
        }, {
            headers: this.orgScopeAuthHeaders(ctx),
        });
    }

    async setOnDutyStatus(ctx: OrgContext, onDuty: boolean) {
        const url = `${apiHost}${API.client.setOnDutyStatus()}`;

        return (await this.tryPost<ClientSideFormat<Me>>(url, {
            onDuty
        }, {
            headers: this.orgScopeAuthHeaders(ctx),
        })).data;
    }

    async confirmRequestAssignment(ctx: OrgContext, requestId: string) {
        const url = `${apiHost}${API.client.confirmRequestAssignment()}`;

        await this.tryPost<void>(url, {
            requestId
        }, {
            headers: this.orgScopeAuthHeaders(ctx),
        });
    }

    async declineRequestAssignment(ctx: OrgContext, requestId: string) {
        const url = `${apiHost}${API.client.declineRequestAssignment()}`;

        await this.tryPost<void>(url, {
            requestId
        }, {
            headers: this.orgScopeAuthHeaders(ctx),
        });
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

    async getRequests(ctx: OrgContext, filter: HelpRequestFilter): Promise<HelpRequest[]> {
        const url = `${apiHost}${API.client.getRequests()}`;

        return (await this.tryPost<HelpRequest[]>(url, {
            filter
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

    async setTeamStatus(ctx: RequestContext, status: ResponderRequestStatuses): Promise<void> {
        const url = `${apiHost}${API.client.setTeamStatus()}`;

        await this.tryPost<void>(url, {
            status
        }, {
            headers: this.requestScopeAuthHeaders(ctx)
        })
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