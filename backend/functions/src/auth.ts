import * as jwt from 'jsonwebtoken';
import config from './config';

const jwtSecrets = config.SESSION.get().secrets;

export type JWTMetadata = {
    userId: string;
    etag: string; // allows us to remotely revoke someones auth
}

export async function createJWT(userId: string, etag: string): Promise<string> {
    const metadata: JWTMetadata = { 
        userId,
        etag
    };

    // get latest because it might have been rotated
    const secret = jwtSecrets[0]; 

    const opts: jwt.SignOptions = { 
        //expires in a day
        expiresIn: 60 * 60 * 24,
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

