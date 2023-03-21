import { autorun, makeAutoObservable, ObservableMap, ObservableSet, reaction, runInAction, set, when } from 'mobx';
import { Store } from './meta';
import { IRequestStore, IShiftStore, IUserStore, manageAttributesStore, organizationStore, PositionScopedMetadata, RequestMetadata, RequestScopedMetadata, userStore } from './interfaces';
import { ClientSideFormat, OrgContext, RequestContext } from '../../../common/api';
import { CalendarDaysFilter, ShiftsFilter, ShiftsRolesFilter, ShiftsFulfilledFilter, CategorizedItem, DefaultRoleIds, HelpRequest, HelpRequestFilter, HelpRequestSortBy, PatchEventType, PatchPermissions, Position, ProtectedUser, RequestStatus, RequestTeamEvent, RequestTeamEventTypes, ResponderRequestStatuses, Role, Shift, RecurringDateTimeRange, RecurringPeriod } from '../../../common/models';
import { api } from '../services/interfaces';
import { persistent, securelyPersistent } from '../meta';
import { userHasAllPermissions } from '../utils';
import { usersAssociatedWithRequest } from '../../../common/utils/requestUtils';
import { resolvePermissionsFromRoles } from '../../../common/utils/permissionUtils';
import moment from 'moment';

@Store(IShiftStore)
export default class ShiftStore implements IShiftStore {
    loading = false;

    @securelyPersistent({
        // TODO: create standard decorators to handle this de/serialization
        // Could also allow for serialization into classes from raw json 
        resolvers: {
            toJSON: (val: ObservableMap) => {
                return val.entries ? val.entries() : {}
            },
            fromJSON: (entries) => {
                return new ObservableMap(entries)
            }
        }
    }) shifts: ObservableMap<string, Shift> = new ObservableMap();

    @persistent() fulfilledFilter = ShiftsFulfilledFilter.All;
    @persistent() rolesFilter = ShiftsRolesFilter.All;
    @persistent() filter = {
        fulfilledFilter: this.fulfilledFilter,
        rolesFilter: this.rolesFilter,
    };

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        await userStore().init();

        if (userStore().signedIn) {
            await this.getShiftsAfterSignin()
        } else {
            when(() => userStore().signedIn, this.getShiftsAfterSignin)
        }
    }

    get shiftsArray() {
        return Array.from(this.shifts.values());
    }

    shiftIsFull(shift: Shift): boolean {
        // If any positions on a shift have fewer than the minimum
        // number of users joined, then the position is not full.
        shift.positions.forEach(position => {
            if (position.joinedUsers.length < position.min) {
                return false;
            }
        })

        return true;
    }

    shiftHasRoles(shift: Shift) {
        if (this.rolesFilter == ShiftsRolesFilter.All) {
            return true;
        } else {
            // TODO
            return false;
        }
    }

    get filteredShifts(): Shift[] {
        return this.shiftsArray.filter((s) => {
            // Either show all shifts regardless of joined users,
            // or only show those that need more users to join.
            const fulfilledFilterStatus = 
                    this.fulfilledFilter == ShiftsFulfilledFilter.All
                    || !this.shiftIsFull(s);

            // Filter out shifts that do not satisfy the Roles filter
            const roleFilterStatus = this.shiftHasRoles(s);
            return fulfilledFilterStatus && roleFilterStatus;
        })
    }


    async loadUntil(predicate: () => Promise<any>): Promise<void> {
        this.loading = true
        await predicate()
        runInAction(() => this.loading = false);
    }

    setFilter = async (filter: ShiftsFilter): Promise<void> => {
        this.filter = filter;
        await this.getShifts();
    }

    setFulfillmentFilter = async (filter: ShiftsFulfilledFilter): Promise<void> => {
        this.filter.fulfilledFilter = filter;
        await this.getShifts();
    }

    setRolesFilter = async (filter: ShiftsRolesFilter): Promise<void> => {
        this.filter.rolesFilter = filter;
        await this.getShifts();
    }

    async getShifts(shiftIds?: string[]): Promise<void> {
        const recurrence: RecurringDateTimeRange = {
            every: {
                period: RecurringPeriod.Week,
                numberOf: 4,
                days: []
            },
            startDate: moment().hour(22).minutes(5).toDate(), // Today @ 10:05pm 
            endDate: moment().hour(22).minutes(5).add(2, 'hours').toDate(), // Tomorrow @ 12:05am 
        };

        const mockShift: Shift = {
            createdAt: '',
            updatedAt: '',
            id: 'mock-id',
            displayId: 'mock-display-id',
            orgId: 'mock-org-id',
            description: 'This is a mock shift!',
            recurrence: recurrence,
            positions: [],
            instances: []
        }

        runInAction(() => {
            this.shifts.merge({
                [mockShift.id]: mockShift
            });
        })
    }

    async getShift(shiftId: string): Promise<void> {
        const mockShift: Shift = {
            createdAt: '',
            updatedAt: '',
            id: 'mock-id',
            displayId: 'mock-display-id',
            orgId: 'mock-org-id',
            description: 'This is a mock shift!',
            recurrence: null,
            positions: [],
            instances: []
        }

        runInAction(() => {
            this.shifts.merge({
                [mockShift.id]: mockShift
            });
        })
    }
    pushShift(shiftId: string): Promise<void> {
        throw new Error('Method not implemented.');
    }
    tryPopShift(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    getShiftsAfterSignin = async () => {
        await this.getShifts([]);

        when(() => !userStore().signedIn, () => {
            when(() => userStore().signedIn, this.getShiftsAfterSignin)
        })
    }

    clear(): void {
        runInAction(() => {
            this.shifts.clear();
        })
    }
}