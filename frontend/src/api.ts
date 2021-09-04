import axios from 'axios';
import Constants from "expo-constants";
import { User, Location } from '../../common/models';
import API from '../../common/api';
const { manifest } = Constants;

// TODO: the port and non local host need to come from config somehow
// let apiHost = !!manifest && (typeof manifest.packagerOpts === `object`) && manifest.packagerOpts.dev
//   ? manifest.debuggerHost && ('http://' + manifest.debuggerHost.split(`:`)[0].concat(`:9000`))
// //   : 'http://localhost:9000'//`TODO: <prod/staging api>`;
//   : '';
let apiHost = 'http://e856-24-44-149-184.ngrok.io' 

export const updateApiHost = (h) => apiHost = h;

export const getApiHost = () => apiHost;

export class APIClient {
    // unauthorized apis

    async signIn(email: string, password: string): Promise<string> {
        const url = `${apiHost}${API.client.signIn()}`;

        const token = (await axios.post<string>(url, {            
            email: email,
            password: password
        })).data

        return token;
    }

    async signUp(email: string, password: string): Promise<string> {
        const url = `${apiHost}${API.client.signUp()}`;

        const token = (await axios.post<string>(url, {            
            email: email,
            password: password
        })).data

        return token;
    }

    // authorized apis

    async me(token: string): Promise<User> {
        const url = `${apiHost}${API.client.me()}`;

        const user = (await axios.post<User>(url, {}, {
            headers: this.authHeaders(token),
          })).data

        return user;
    }

    async signOut(token: string) {
        const url = `${apiHost}${API.client.signOut()}`;

        await axios.post(url, {}, {
            headers: this.authHeaders(token),
        });
    }

    async reportLocation(locations: Location[], token: string) {
        const url = `${apiHost}${API.client.reportLocation()}`;

        await axios.post<User>(url, {            
            locations
        }, {
            headers: this.authHeaders(token),
        })
    }

    async reportPushToken(token: string) {
        const url = `${apiHost}${API.client.reportPushToken()}`;

        await axios.post<void>(url, {            
            token
        })
    }

    async dispatch(token: string) {
        const url = `${apiHost}${API.client.dispatch()}`;

        await axios.post<void>(url, {}, {
            headers: this.authHeaders(token),
        });
    }

    async assignIncident(token: string) {
        const url = `${apiHost}${API.client.assignIncident()}`;

        await axios.post<void>(url, {}, {
            headers: this.authHeaders(token),
        });
    }

    async confirmIncidentAssignment(token: string) {
        const url = `${apiHost}${API.client.confirmIncidentAssignment()}`;

        await axios.post<void>(url, {}, {
            headers: this.authHeaders(token),
        });
    }

    async declineIncidentAssignment(token: string) {
        const url = `${apiHost}${API.client.declineIncidentAssignment()}`;

        await axios.post<void>(url, {}, {
            headers: this.authHeaders(token),
        });
    }

    authHeaders(token: string) {
        return {
            'Authorization': `Bearer ${token}`
        }
    }
} 

export default new APIClient();