import * as jwt from 'jsonwebtoken';
import config from './config';

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
    // get latest because it might have been rotated
    const secret = accessTokenSecrets[0]; 
     
    const expiresInSec = accessTokenExpirationInSecs;

    return createAuthToken(userId, etag, secret, expiresInSec);
}

export async function createRefreshToken(userId: string, etag: string): Promise<string> {
    // get latest because it might have been rotated
    const secret = refreshTokenSecrets[0]; 
    
    const expiresInSec = refreshTokenExpirationInSecs;

    return createAuthToken(userId, etag, secret, expiresInSec);
}

export async function createAuthToken(userId: string, etag: string, secret: { kid: string, value: string }, expInSecs: number): Promise<string> {
    const metadata: JWTMetadata = { 
        userId,
        etag
    };

    const opts: jwt.SignOptions = { 
        //expires in one hour
        expiresIn: expInSecs,
        keyid: secret.kid
    }; 

    const token = await new Promise<string>((resolve, reject) => {
        jwt.sign(metadata, secret.value, opts, function(err, token) {
            if (err) {
                reject(err)
            } else {
                resolve(token)
            }
        });
    });

    return token;
}

