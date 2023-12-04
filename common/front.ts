export * from './models';

import { ClientSideFormat } from './api'
import { HelpRequest as DBHelpRequest } from './models';

export type HelpRequest = ClientSideFormat<DBHelpRequest>