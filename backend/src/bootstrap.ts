require('module-alias/register');

import {Server} from "./server";
import {PlatformExpress} from "@tsed/platform-express";
import {$log} from "@tsed/common";


export async function bootstrap() {
  try {
    $log.debug("Start server...");
    const platform = await PlatformExpress.bootstrap(Server);
    return platform;
  } catch (er) {
    $log.error('error during boot:', er);
    throw er
  }
}