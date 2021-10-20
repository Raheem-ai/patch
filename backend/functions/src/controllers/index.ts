import { HeaderParams, Req } from "@tsed/common";
import { IApiClient, ServerSide } from "common/api";
import API from 'common/api';
import { MongooseDocument } from "@tsed/mongoose";
import { HelpRequestDoc, HelpRequestModel } from "../models/helpRequest";
import { UserDoc, UserModel } from "../models/user";

export type APIController<T extends keyof IApiClient> = Pick<ServerSide<HelpRequestDoc, UserDoc>, T>

export function OrgId(): ParameterDecorator {
    return HeaderParams(API.orgIdHeader)
}

export function RequestId(): ParameterDecorator {
    return HeaderParams(API.requestIdHeader)
}