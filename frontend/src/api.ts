import axios from 'axios';
import Constants from "expo-constants";
import { User, Location } from '../../common/models';
import API from '../../common/api';
const { manifest } = Constants;

// TODO: the port and non local host need to come from config somehow
const host = !!manifest && (typeof manifest.packagerOpts === `object`) && manifest.packagerOpts.dev
  ? manifest.debuggerHost && ('http://' + manifest.debuggerHost.split(`:`)[0].concat(`:9000`))
  : 'http://localhost:9000'//`TODO: <prod/staging api>`;

export class APIClient {
    // backend only returns the user the first time you sign in...if you're currently signed in it will return nothing
    // so make types make the consumer check against that
    async signIn(email: string, password: string): Promise<User | null> {
        const url = `${host}${API.client.signIn()}`;

        const user = (await axios.post<User>(url, {            
            email: email,
            password: password
        })).data

        return user || null;
    }

    async signUp(email: string, password: string): Promise<User> {
        const url = `${host}${API.client.signUp()}`;

        const user = (await axios.post<User>(url, {            
            email: email,
            password: password
        })).data

        return user;
    }

    async signOut() {
        const url = `${host}${API.client.signOut()}`;

        await axios.post(url)
    }

    async reportLocation(locations: Location[]) {
        const url = `${host}${API.client.reportLocation()}`;

        await axios.post<User>(url, {            
            locations
        })
    }

    async reportPushToken(token: string) {
        const url = `${host}${API.client.reportPushToken()}`;

        await axios.post<void>(url, {            
            token
        })
    }

    async dispatch() {
        const url = `${host}${API.client.dispatch()}`;

        await axios.post<void>(url);
    }

    async assignIncident() {
        const url = `${host}${API.client.assignIncident()}`;

        await axios.post<void>(url);
    }

    async confirmIncidentAssignment() {
        const url = `${host}${API.client.confirmIncidentAssignment()}`;

        await axios.post<void>(url);
    }

    async declineIncidentAssignment() {
        const url = `${host}${API.client.declineIncidentAssignment()}`;

        await axios.post<void>(url);
    }
} 

export default new APIClient();