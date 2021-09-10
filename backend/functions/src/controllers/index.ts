import { Req } from "@tsed/common";
import { IApiClient, ServerSide } from "common/api";

export type APIController<T extends keyof IApiClient> = Pick<ServerSide<Req>, T>