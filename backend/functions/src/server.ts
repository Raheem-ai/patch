import {Configuration, Inject, PlatformApplication} from "@tsed/common";
import bodyParser from "body-parser";
import compress from "compression";
import cookieParser from "cookie-parser";
import methodOverride from "method-override";
import session from 'express-session';
import * as uuid from 'uuid';
import {SessionCookieName} from 'common/constants'
import "@tsed/ajv"; // sets up schema validation

const rootDir = __dirname;


@Configuration({
  rootDir,
  componentsScan: [
    `${rootDir}/protocols/**/*.ts` // scan protocols directory
  ],
  mount: {
    "/api": `${rootDir}/controllers/**/*.ts`
  },
  acceptMimes: ["application/json"]
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
          secret: uuid.v1(), // this will create a session on each restart...this should come from config
          name: SessionCookieName
      }));
  }
}