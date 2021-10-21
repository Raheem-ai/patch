import {Configuration, Inject, PlatformApplication} from "@tsed/common";
import bodyParser from "body-parser";
import compress from "compression";
import cookieParser from "cookie-parser";
import methodOverride from "method-override";
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
const mongoConnectionString = config.MONGO.get().connection_string;

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
    // Note: creates it's own connection to the DB
    url: mongoConnectionString,
  },
  agenda: { 
    enabled: true,
    db: { 
      // Note: creates it's own connection to the DB
      address: mongoConnectionString, 
      collection: 'jobsManager' 
    } 
  },
  // PORT set by Google Cloud Run
  port: process.env.PORT || 9000
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
      }));
  }
}