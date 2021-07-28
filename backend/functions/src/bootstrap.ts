require('module-alias/register');

import {Server} from "./server";
import {PlatformExpress} from "@tsed/platform-express";
import {$log} from "@tsed/common";

let platform: PlatformExpress;

export async function bootstrap() {
  try {
    $log.debug("Start server...");
    platform = await PlatformExpress.bootstrap(Server);
    return platform;
  } catch (er) {
    $log.error('error during boot:', er);
    throw er
  }
}