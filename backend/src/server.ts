import {Configuration, Inject, PlatformApplication} from "@tsed/common";
import bodyParser from "body-parser";
import compress from "compression";
import cookieParser from "cookie-parser";
import methodOverride from "method-override";
import API from 'common/api';
import "@tsed/ajv"; // sets up schema validation
import "@tsed/mongoose"; // db connecting
import '@tsed/agenda';
import "@tsed/platform-express";
import "@tsed/socketio";
import config from './config';
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { trySetupLocalEnv, trySetupLocalGCPCredentials } from "./common/env";

trySetupLocalEnv()

const mongoConnectionString = config.MONGO_CONNECTION_STRING.get().connection_string;

const redisConnectionString = config.REDIS.get().connection_string

const socketIOPubClient = createClient({ 
  url: redisConnectionString
});
const socketIOSubClient = socketIOPubClient.duplicate();

trySetupLocalGCPCredentials()

const rootDir = __dirname;

@Configuration({
  rootDir,
  componentsScan: [
    `${rootDir}/protocols/**/*.ts`, // scan protocols directory
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
  socketIO: {
    serveClient: false,
    adapter: createAdapter(socketIOPubClient, socketIOSubClient)
    // cors: true
  },
  // ajv: {
  //   errorFormatter: (error: AjvErrorObject) => {
  //     const errMessage = `At ${error.modelName}${error.instancePath}, value '${error.data}' ${error.message}`

  //     console.log(errMessage)

  //     return errMessage;
  //   },
  //   verbose: true,
  //   allErrors: true
  // },
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

  async $beforeInit() {
    // TODO: need to setup way for this to connect to the vpc network for staging/prod when running locally
    await Promise.all([socketIOPubClient.connect(), socketIOSubClient.connect()])
  }
}