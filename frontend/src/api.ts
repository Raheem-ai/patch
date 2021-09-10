import axios from 'axios';
import Constants from "expo-constants";
import { User, Location, Me, Organization, UserRole, MinOrg, BasicCredentials, MinUser } from '../../common/models';
import API, { IApiClient } from '../../common/api';
const { manifest } = Constants;

// TODO: the port and non local host need to come from config somehow
// let apiHost = !!manifest && (typeof manifest.packagerOpts === `object`) && manifest.packagerOpts.dev
//   ? manifest.debuggerHost && ('http://' + manifest.debuggerHost.split(`:`)[0].concat(`:9000`))
// //   : 'http://localhost:9000'//`TODO: <prod/staging api>`;
//   : '';
let apiHost = 'http://e856-24-44-149-184.ngrok.io' 

export const updateApiHost = (h) => apiHost = h;

export const getApiHost = () => apiHost;

export class APIClient implements IApiClient {
    // unauthorized apis

    async signIn(credentials: BasicCredentials): Promise<string> {
        const url = `${apiHost}${API.client.signIn()}`;

        const token = (await axios.post<string>(url, credentials)).data

        return token;
    }

    async signUp(minUser: MinUser): Promise<string> {
        const url = `${apiHost}${API.client.signUp()}`;

        const token = (await axios.post<string>(url, minUser)).data

        return token;
    }

    // user scoped apis

    async me(token: string): Promise<Me> {
        const url = `${apiHost}${API.client.me()}`;

        const user = (await axios.post<Me>(url, {}, {
            headers: this.userScopeAuthHeaders(token),
          })).data

        return user;
    }

    async signOut(token: string) {
        const url = `${apiHost}${API.client.signOut()}`;

        await axios.post(url, {}, {
            headers: this.userScopeAuthHeaders(token),
        });
    }

    async reportLocation(token: string, locations: Location[]) {
        const url = `${apiHost}${API.client.reportLocation()}`;

        await axios.post<User>(url, {            
            locations
        }, {
            headers: this.userScopeAuthHeaders(token),
        })
    }

    async reportPushToken(token: string) {
        const url = `${apiHost}${API.client.reportPushToken()}`;

        await axios.post<void>(url, {            
            token
        }, {
            headers: this.userScopeAuthHeaders(token),
        })
    }

    async createOrg(token: string, org: MinOrg) {
        const url = `${apiHost}${API.client.reportPushToken()}`;

        return (await axios.post<{ user: User, org: Organization }>(url, {            
            org
        }, {
            headers: this.userScopeAuthHeaders(token),
        })).data
    }

    // org scoped apis

    async broadcastRequest(token: string, orgId: string, requestId: string, to: string[]) {
        const url = `${apiHost}${API.client.broadcastRequest()}`;

        await axios.post<void>(url, {
            requestId,
            to
        }, {
            headers: this.orgScopeAuthHeaders(token, orgId),
        });
    }

    async assignRequest(token: string, orgId: string, requestId: string, to: string[]) {
        const url = `${apiHost}${API.client.assignRequest()}`;

        await axios.post<void>(url, {
            requestId,
            to
        }, {
            headers: this.orgScopeAuthHeaders(token, orgId),
        });
    }

    async confirmRequestAssignment(token: string, orgId: string, requestId: string) {
        const url = `${apiHost}${API.client.confirmRequestAssignment()}`;

        await axios.post<void>(url, {}, {
            headers: this.orgScopeAuthHeaders(token, orgId),
        });
    }

    async declineRequestAssignment(token: string, orgId: string, requestId: string) {
        const url = `${apiHost}${API.client.declineRequestAssignment()}`;

        await axios.post<void>(url, {}, {
            headers: this.orgScopeAuthHeaders(token, orgId),
        });
    }

    async addUserToOrg(token: string, orgId: string, userId: string, roles: UserRole[]) {
        const url = `${apiHost}${API.client.addUserToOrg()}`;

        return (await axios.post<{ user: User, org: Organization }>(url, {
            userId,
            roles
        }, {
            headers: this.orgScopeAuthHeaders(token, orgId)
        })).data
    }

    async removeUserFromOrg(token: string, orgId: string, userId: string) {
        const url = `${apiHost}${API.client.removeUserFromOrg()}`;

        return (await axios.post<{ user: User, org: Organization }>(url, {
            userId
        }, {
            headers: this.orgScopeAuthHeaders(token, orgId)
        })).data
    }

    async removeUserRoles(token: string, orgId: string, userId: string, roles: UserRole[]) {
        const url = `${apiHost}${API.client.removeUserRoles()}`;

        return (await axios.post<User>(url, {
            userId,
            roles
        }, {
            headers: this.orgScopeAuthHeaders(token, orgId)
        })).data
    }

    async addUserRoles(token: string, orgId: string, userId: string, roles: UserRole[]) {
        const url = `${apiHost}${API.client.addUserRoles()}`;

        return (await axios.post<User>(url, {
            userId,
            roles
        }, {
            headers: this.orgScopeAuthHeaders(token, orgId)
        })).data
    }

    userScopeAuthHeaders(token: string) {
        return {
            'Authorization': `Bearer ${token}`
        }
    }

    orgScopeAuthHeaders(token: string, orgId: string) {
        return {
            'Authorization': `Bearer ${token}`,
            [API.orgIDHeader]: orgId
        }
    }
} 

export default new APIClient();