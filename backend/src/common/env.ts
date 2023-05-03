import dotenv from 'dotenv';
import { join, resolve } from "path";
import { EnvironmentId } from "infra/src/environment";
import { homedir } from "os";
import { existsSync } from "fs";

export function trySetupLocalEnv(envId?: EnvironmentId) {
    // *** rootdir is from output lib file structure not src ***
    const rootDir = __dirname;

    const env = EnvironmentId[envId] || process.env.PATCH_LOCAL_ENV;

    if (env) {
        const dotEnvPath = resolve(rootDir, `../../../../env/.env.${env}`);

        dotenv.config( {
            path: dotEnvPath
        })
    }
}

export function trySetupLocalGCPCredentials(envId?: EnvironmentId) {
    const env = EnvironmentId[envId] || process.env.PATCH_LOCAL_ENV;

    if (env) {
        const envName = env == EnvironmentId[EnvironmentId.dev]
          ? EnvironmentId[EnvironmentId.staging]
          : env;
      
        // TODO: finding this path should come from infra
        const root = process.env.RAHEEM_INFRA_ROOT || resolve(homedir(), '.raheem_infra');
        const googleCredsPath = join(root, `/config/raheem-${envName}-adc.json`);
      
        if (existsSync(googleCredsPath)) {
          process.env.GOOGLE_APPLICATION_CREDENTIALS = googleCredsPath
        }
      }
}