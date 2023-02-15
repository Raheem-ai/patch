import { Controller, Get } from "@tsed/common";
import API from 'common/api';
import { readFileSync, writeFileSync } from "fs";
import jose from 'node-jose'

@Controller(API.namespaces.webhooks)
export class WebhooksController {
    
    @Get(API.server.getJWKS())
    async getJWKS() {
        let keyStore: jose.JWK.KeyStore;

        try {
            const keyStoreFile = readFileSync('./sessionKeys', 'utf8');
            keyStore = await jose.JWK.asKeyStore(keyStoreFile);
        } catch (e) {
            // TODO: move this logic to rotation code for the session secret
            keyStore = jose.JWK.createKeyStore();
            
            // create new key
            await keyStore.generate('RSA', 2048, { alg: "RS256", use: "sig" });

            // export keyset to json
            const pubPrivKeySet = JSON.stringify(keyStore.toJSON(true));
            writeFileSync('./sessionKeys', pubPrivKeySet);
        }

        const pubKeySet = keyStore.toJSON()

        return pubKeySet
    }
}