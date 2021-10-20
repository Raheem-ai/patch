import axios from 'axios';
import Constants from "expo-constants";
import { User, Location, Me, Organization, UserRole, MinOrg, BasicCredentials, MinUser, ResponderRequestStatuses, ChatMessage, HelpRequest, MinHelpRequest, ProtectedUser, HelpRequestFilter } from '../../common/models';
import API, { ClientSideApi, ClientSideFormat, IApiClient, OrgContext, RequestContext, TokenContext } from '../../common/api';
const { manifest } = Constants;

// TODO: the port and non local host need to come from config somehow
// let apiHost = !!manifest && (typeof manifest.packagerOpts === `object`) && manifest.packagerOpts.dev
//   ? manifest.debuggerHost && ('http://' + manifest.debuggerHost.split(`:`)[0].concat(`:9000`))
// //   : 'http://localhost:9000'//`TODO: <prod/staging api>`;
//   : '';
let apiHost = 'http://6e73-24-44-148-246.ngrok.io' 

export const updateApiHost = (h) => apiHost = h;

export const getApiHost = () => apiHost;

export class APIClient implements ClientSideApi<'me' | 'setOnDutyStatus'> {
    // unauthorized apis

    async signIn(credentials: BasicCredentials): Promise<string> {
        const url = `${apiHost}${API.client.signIn()}`;

        const token = (await axios.post<string>(url, { credentials })).data

        return token;
    }

    async signUp(user: MinUser): Promise<string> {
        const url = `${apiHost}${API.client.signUp()}`;

        const token = (await axios.post<string>(url, { user })).data

        return token;
    }

    // user scoped apis

    async me(ctx: TokenContext): Promise<ClientSideFormat<Me>> {
        const url = `${apiHost}${API.client.me()}`;

        const user = (await axios.post<ClientSideFormat<Me>>(url, {}, {
            headers: this.userScopeAuthHeaders(ctx),
          })).data

        return user;
    }

    async signOut(ctx: TokenContext) {
        const url = `${apiHost}${API.client.signOut()}`;

        await axios.post(url, {}, {
            headers: this.userScopeAuthHeaders(ctx),
        });
    }

    async reportLocation(ctx: TokenContext, locations: Location[]) {
        const url = `${apiHost}${API.client.reportLocation()}`;

        await axios.post<User>(url, {            
            locations
        }, {
            headers: this.userScopeAuthHeaders(ctx),
        })
    }

    async reportPushToken(ctx: TokenContext, token: string) {
        const url = `${apiHost}${API.client.reportPushToken()}`;

        await axios.post<void>(url, {            
            token
        }, {
            headers: this.userScopeAuthHeaders(ctx),
        })
    }

    async createOrg(ctx: TokenContext, org: MinOrg) {
        const url = `${apiHost}${API.client.createOrg()}`;

        return (await axios.post<{ user: User, org: Organization }>(url, {            
            org
        }, {
            headers: this.userScopeAuthHeaders(ctx),
        })).data
    }

    // org scoped apis

    async broadcastRequest(ctx: OrgContext, requestId: string, to: string[]) {
        const url = `${apiHost}${API.client.broadcastRequest()}`;

        await axios.post<void>(url, {
            requestId,
            to
        }, {
            headers: this.orgScopeAuthHeaders(ctx),
        });
    }

    async assignRequest(ctx: OrgContext, requestId: string, to: string[]) {
        const url = `${apiHost}${API.client.assignRequest()}`;

        await axios.post<void>(url, {
            requestId,
            to
        }, {
            headers: this.orgScopeAuthHeaders(ctx),
        });
    }

    async setOnDutyStatus(ctx: OrgContext, onDuty: boolean) {
        const url = `${apiHost}${API.client.setOnDutyStatus()}`;

        return (await axios.post<ClientSideFormat<Me>>(url, {
            onDuty
        }, {
            headers: this.orgScopeAuthHeaders(ctx),
        })).data;
    }

    async confirmRequestAssignment(ctx: OrgContext, requestId: string) {
        const url = `${apiHost}${API.client.confirmRequestAssignment()}`;

        await axios.post<void>(url, {
            requestId
        }, {
            headers: this.orgScopeAuthHeaders(ctx),
        });
    }

    async declineRequestAssignment(ctx: OrgContext, requestId: string) {
        const url = `${apiHost}${API.client.declineRequestAssignment()}`;

        await axios.post<void>(url, {
            requestId
        }, {
            headers: this.orgScopeAuthHeaders(ctx),
        });
    }

    async addUserToOrg(ctx: OrgContext, userId: string, roles: UserRole[]) {
        const url = `${apiHost}${API.client.addUserToOrg()}`;

        return (await axios.post<{ user: User, org: Organization }>(url, {
            userId,
            roles
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async removeUserFromOrg(ctx: OrgContext, userId: string) {
        const url = `${apiHost}${API.client.removeUserFromOrg()}`;

        return (await axios.post<{ user: User, org: Organization }>(url, {
            userId
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async removeUserRoles(ctx: OrgContext, userId: string, roles: UserRole[]) {
        const url = `${apiHost}${API.client.removeUserRoles()}`;

        return (await axios.post<User>(url, {
            userId,
            roles
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async addUserRoles(ctx: OrgContext, userId: string, roles: UserRole[]) {
        const url = `${apiHost}${API.client.addUserRoles()}`;

        return (await axios.post<User>(url, {
            userId,
            roles
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async getTeamMembers(ctx: OrgContext, userIds?: string[]): Promise<ProtectedUser[]> {
        const url = `${apiHost}${API.client.getTeamMembers()}`;

        return (await axios.post<ProtectedUser[]>(url, {
            userIds
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async getRespondersOnDuty(ctx: OrgContext): Promise<ProtectedUser[]> {
        const url = `${apiHost}${API.client.getRespondersOnDuty()}`;

        return (await axios.get<ProtectedUser[]>(url, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async createNewRequest(ctx: OrgContext, request: MinHelpRequest): Promise<HelpRequest> {
        const url = `${apiHost}${API.client.createNewRequest()}`;

        return (await axios.post<HelpRequest>(url, {
            request
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async getRequests(ctx: OrgContext, filter: HelpRequestFilter): Promise<HelpRequest[]> {
        const url = `${apiHost}${API.client.getRequests()}`;

        return (await axios.post<HelpRequest[]>(url, {
            filter
        }, {
            headers: this.orgScopeAuthHeaders(ctx)
        })).data
    }

    async getRequest(ctx: OrgContext, requestId: string): Promise<HelpRequest> {
        const url = `${apiHost}${API.client.getRequest()}`;

        return (await axios.get<HelpRequest>(url, {
            headers: this.requestScopeAuthHeaders({ ...ctx, requestId })
        })).data
    }

    async unAssignRequest(ctx: RequestContext, userId: string): Promise<void> {
        const url = `${apiHost}${API.client.unAssignRequest()}`;

        await axios.post<void>(url, {
            userId
        }, {
            headers: this.requestScopeAuthHeaders(ctx)
        })
    }

    async sendChatMessage(ctx: RequestContext, message: string): Promise<HelpRequest> {
        const url = `${apiHost}${API.client.sendChatMessage()}`;

        return (await axios.post<HelpRequest>(url, {
            message
        }, {
            headers: this.requestScopeAuthHeaders(ctx)
        })).data
    }

    async setTeamStatus(ctx: RequestContext, status: ResponderRequestStatuses): Promise<void> {
        const url = `${apiHost}${API.client.setTeamStatus()}`;

        await axios.post<void>(url, {
            status
        }, {
            headers: this.requestScopeAuthHeaders(ctx)
        })
    }

    async updateRequestChatReceipt(ctx: RequestContext, lastMessageId: number): Promise<HelpRequest> {
        const url = `${apiHost}${API.client.updateRequestChatReceipt()}`;

        return (await axios.post<HelpRequest>(url, {
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

export default new APIClient();