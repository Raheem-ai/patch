import { makeAutoObservable } from 'mobx';
import { Store } from './meta';
import { ICreateShiftStore, shiftStore, userStore } from './interfaces';
import { OrgContext } from '../../../common/api';
import { DefaultRoleIds, MinShift, Position, RecurringDateTimeRange, Shift } from '../../../common/models';


@Store(ICreateShiftStore)
export default class CreateShiftStore implements ICreateShiftStore  {
    title: string = ''
    description: string = ''
    positions: Position[] = []
    recurrence: RecurringDateTimeRange = null

    constructor() {
        makeAutoObservable(this)
    }

    orgContext(): OrgContext {
        return {
            token: userStore().authToken,
            orgId: userStore().currentOrgId
        }
    }

    // need to edit these to make sure we're sending the right params to the server
    // ie. a role is set, then it is deleted while i'm still in the create flow
    // now i'm referencing an old role and even though positionsInput handles defaulting to
    // Anyone visually
    onRoleDeletedUpdate(roleId: string): void {
        this.positions.forEach(pos => {
            if (pos.role == roleId) {
                pos.role = DefaultRoleIds.Anyone
            }
        })
    }
    
    async createShift(): Promise<Shift> {
        const shift: MinShift = {
            title: this.title,
            description: this.description,
            positions: this.positions,
            recurrence: this.recurrence
        }

        // const createdShift = await api().createNewShift(this.orgContext(), shift);
        const createdShift = null;

        // shiftStore().updateOrAddShift(createdShift);

        return createdShift;
    }

    clear(): void {
        this.title = '';
        this.description = '';
        this.positions = [];
        this.recurrence = null;
    }
   
}