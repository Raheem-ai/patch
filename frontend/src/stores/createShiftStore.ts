import { makeAutoObservable } from 'mobx';
import { Store } from './meta';
import { ICreateShiftStore, shiftStore, userStore } from './interfaces';
import { OrgContext } from '../../../common/api';
import { api } from '../services/interfaces';
import { DefaultRoleIds, MinShift, Position, RecurringDateTimeRange, Shift, WithoutDates } from '../../../common/models';
import moment from 'moment';


@Store(ICreateShiftStore)
export default class CreateShiftStore implements ICreateShiftStore  {
    title: string = ''
    description: string = ''
    positions: Position[] = []

    // TODO: How do we want to initialize this value?
    // I update the value in createShift.componentDidMount but it still throws if not set here.
    startDate: Date = moment().toDate();
    recurrence: RecurringDateTimeRange = this.defaultShiftDateTime

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

    get defaultShiftDateTime() {
        // Get the current time's hours and minutes
        const now = moment().toDate();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();

        // The hours and minutes variables that track
        // the default start datetime, we'll return
        let minutes = 0;
        let hours = 0;

        // If the current time is within the first half of
        // the hour, set the shift to begin at the half hour mark
        // of the current hour. Otherwise at the start of the next hour.
        if (currentMinutes < 30) {
            minutes = 30;
            hours = currentHours;
        } else {
            minutes = 0;
            hours = currentHours + 1;
        }

        // Set the default start date and time to the class's start date and the nearest upcoming half hour,
        // per the logic above. Set the end time to be an hour after the calculated start.
        const defaultStart = moment(this.startDate).hours(hours).minutes(minutes).seconds(0).milliseconds(0).toDate();
        const defaultEnd = moment(defaultStart).add(1, 'hours').toDate();

        return {
            startDate: defaultStart,
            endDate: defaultEnd
        }
    }

    async setStartDate(date?: Date): Promise<void> {
        if (date) {
            this.startDate = date;
        } else {
            this.startDate = moment().toDate();
        }

        this.recurrence = this.defaultShiftDateTime;
    };

    async createShift(): Promise<WithoutDates<Shift>> {
        const shift: MinShift = {
            title: this.title,
            description: this.description,
            positions: this.positions,
            recurrence: this.recurrence
        }

        const createdShift: WithoutDates<Shift> = await api().createNewShift(this.orgContext(), shift);
        shiftStore().updateOrAddShift(createdShift);
        return createdShift;
    }

    clear(): void {
        this.title = '';
        this.description = '';
        this.positions = [];
        // TODO: Setting value to null causes crash when the form is closed/cancelled.
        // this.recurrence = null;
    }
   
}