import dotenv from 'dotenv';
import { join, resolve } from "path";
import { EnvironmentId } from "infra/src/environment";
import { env } from "process";
import { homedir } from "os";
import { existsSync } from "fs";

export function trySetupLocalEnv() {
    // *** rootdir is from output lib file structure not src ***
    const rootDir = __dirname;

    if (process.env.PATCH_LOCAL_ENV) {
        const dotEnvPath = resolve(rootDir, `../../../../env/.env.${process.env.PATCH_LOCAL_ENV}`);
        
        dotenv.config( {
            path: dotEnvPath
        })
    }
}

export function trySetupLocalGCPCredentials() {
    if (env.PATCH_LOCAL_ENV) {
        const envName = env.PATCH_LOCAL_ENV == EnvironmentId[EnvironmentId.dev]
          ? EnvironmentId[EnvironmentId.staging]
          : env.PATCH_LOCAL_ENV;
      
        // TODO: finding this path should come from infra
        const root = process.env.RAHEEM_INFRA_ROOT || resolve(homedir(), '.raheem_infra');
        const googleCredsPath = join(root, `/config/raheem-${envName}-adc.json`);
      
        if (existsSync(googleCredsPath)) {
          env.GOOGLE_APPLICATION_CREDENTIALS = googleCredsPath
        }
      }
}