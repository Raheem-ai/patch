import jwt, { decode, Jwt, verify } from 'jsonwebtoken';
import config from './config';
import { DBManager } from './services/dbManager';
import { readFileSync } from "fs";
import jose from 'node-jose'

const accessTokenSecrets = config.SESSION.get().accessTokenSecrets;
const refreshTokenSecrets = config.SESSION.get().refreshTokenSecrets;

//expires in 15 mins
const accessTokenExpirationInSecs = 60 * 15;

//expires in 6 hours
const refreshTokenExpirationInSecs = 60 * 60 * 6;

export type JWTMetadata = {
    userId: string;
    etag: string; // allows us to remotely revoke someones auth
}

export async function createAccessToken(userId: string, etag: string): Promise<string> {
    const expiresInSec = accessTokenExpirationInSecs;

    return createAuthToken(userId, etag, await getPrivateKeySecret(), expiresInSec);
}

export async function getPrivateKeySecret() {
    const keyStore = await jose.JWK.asKeyStore(readFileSync('./sessionKeys', 'utf8'));
    
    const keys = keyStore.all();
    // adding a new key adds it to the end
    const key = keys[keys.length - 1]
    
    const privateKey = key.toPEM(true)
    
    return {
        kid: key.kid,
        value: privateKey
    }
}

export async function getPubKeySecret(kid: string) {
    const keyStore = await jose.JWK.asKeyStore(readFileSync('./sessionKeys', 'utf8'));
    
    const key = keyStore.get(kid);

    if (!key) {
        throw `key not found: ${kid}`
    }
    
    const pubKey = key.toPEM()
    
    return {
        kid: key.kid,
        value: pubKey
    }
}

export async function createRefreshToken(userId: string, etag: string): Promise<string> {
    const expiresInSec = refreshTokenExpirationInSecs;

    return createAuthToken(userId, etag, await getPrivateKeySecret(), expiresInSec);
}

export async function createAuthToken(userId: string, etag: string, secret: { kid: string, value: string }, expInSecs: number): Promise<string> {
    const metadata: JWTMetadata = { 
        userId,
        etag
    };

    const opts: jwt.SignOptions = { 
        //expires in one hour
        algorithm: 'RS256',
        expiresIn: expInSecs,
        keyid: secret.kid,
        audience: 'patch-mljxq',
        subject: userId
    };

    const token = await new Promise<string>((resolve, reject) => {
        jwt.sign(metadata, secret.value, opts, function(err, token) {
            if (err) {
                reject(err)
            } else {
                console.log(token)
                resolve(token)
            }
        });
    });

    return token;
}

export async function verifyRefreshToken(refreshToken: string, dbManager: DBManager) {
    const decodedRefreshToken = decode(refreshToken, { complete: true });

        if (!decodedRefreshToken) {
            throw `malformed refresh token: ${refreshToken}`
        }

        const secret = await getPubKeySecret(decodedRefreshToken.header.kid)

        let refreshTokenPayload;

        try {
            refreshTokenPayload = await new Promise<JWTMetadata>((resolve, reject) => {
                verify(refreshToken, secret.value, { complete: true }, (err, jwt: Jwt) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(jwt.payload as JWTMetadata)
                    }
                });
            })
        } catch (e) {
            const err = e as Error;
            throw err.message
        }

        const userId = refreshTokenPayload.userId;

        const user = await dbManager.getUserById(userId);

        if (!user) {
            throw `couldn't find token user`
        }

        if (user.auth_etag != refreshTokenPayload.etag) {
            throw `etags don't match`
        }

        return user
}