import {Configuration, Inject, PlatformApplication} from "@tsed/common";
import bodyParser from "body-parser";
import compress from "compression";
import cookieParser from "cookie-parser";
import methodOverride from "method-override";
import session from 'express-session';
import * as uuid from 'uuid';
import {SessionCookieName} from 'common/constants'
import API from 'common/api';
import "@tsed/ajv"; // sets up schema validation
import "@tsed/mongoose"; // db connecting
import '@tsed/agenda';
import config from './config';
import { EnvironmentId } from "infra/src/environment";
import dotenv from 'dotenv';
import { resolve } from "path";

const rootDir = __dirname;

if (process.env.PATCH_LOCAL_ENV) {
  const dotEnvPath = resolve(rootDir, `../../../../env/.env.${process.env.PATCH_LOCAL_ENV}`);
  
  dotenv.config( {
    path: dotEnvPath
  })
}

const isProd = config.RAHEEM.get().environment == EnvironmentId[EnvironmentId.prod];
const sessionSecret = config.SESSION.get().secrets;
const mongoConnectionString = config.MONGO.get().connectionString;

@Configuration({
  rootDir,
  componentsScan: [
    `${rootDir}/protocols/**/*.ts` // scan protocols directory
  ],
  mount: {
    [API.base]: `${rootDir}/controllers/**/*.ts`
  },
  acceptMimes: ["application/json"],
  mongoose: {
    url: mongoConnectionString,
  },
  agenda: { 
    enabled: true,
    db: { 
      address: mongoConnectionString, 
      collection: 'jobsManager' 
    } 
  },
  port: 9000
})
export class Server {
  @Inject()
  app: PlatformApplication;

  @Configuration()
  settings: Configuration;

  /**
   * This method let you configure the express middleware required by your application to works.
   * @returns {Server}
   */
  public $beforeRoutesInit(): void | Promise<any> {
    this.app
      .use(cookieParser())
      .use(compress({}))
      .use(methodOverride())
      .use(bodyParser.json())
      .use(bodyParser.urlencoded({
        extended: true
      }))
      .use(session({
          secret: sessionSecret,
          name: SessionCookieName
      }));
  }
}