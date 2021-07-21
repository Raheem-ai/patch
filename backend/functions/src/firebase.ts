import {$log} from "@tsed/common";
import * as functions from "firebase-functions";
import { bootstrap } from "./bootstrap";

const initialization = bootstrap();

// i think this needs to be http to test?
export const app = functions.https.onRequest(async (req, res) => {
  const platform = await initialization;
  $log.info("after initialization")
  await platform.app.raw(req, res);
});