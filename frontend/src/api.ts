import axios from 'axios';
import Constants from "expo-constants";
import { User } from '../../common/models';
import API from '../../common/api';
const { manifest } = Constants;

// TODO: the port and non local host need to come from config somehow
const host = !!manifest && (typeof manifest.packagerOpts === `object`) && manifest.packagerOpts.dev
  ? manifest.debuggerHost && ('http://' + manifest.debuggerHost.split(`:`)[0].concat(`:9000`))
  : `TODO: <prod/staging api>`;

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
}

export default new APIClient();