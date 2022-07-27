import { visualDelim } from "../frontend/src/constants";

const STRINGS = {

    // GLOBAL
    responders: (n: number) => n > 1 ? 'responders' : 'responder',

    REQUESTS: {
        NOTIFICATIONS: {
            notifyNResponders: (n: number) => `Notify ${n} ${STRINGS.responders(n)}`,
            NRespondersNotified: (n: number) => `${n} ${n === 1 ? `person` : `people`} notified`,
            NRespondersAsking: (n: number) => ` ${visualDelim} ${n} asking`,
            notifyPeople: 'Notify people',
            SECTIONS: {
                asked: 'Asked to join',
                denied: 'Denied',
                joined: 'Joined',
                viewed: 'Viewed request',
                sent: 'Sent notification',
            }
        },
        TOGGLE: {
            toggleRequest: (isOpen: boolean) => isOpen ? 'Close this request' : 'Re-open this request',
            title: 'Type of request',
            message: `Are you sure you want to close this request without specifying its type?`,
            add: 'Add now',
            close: 'Close anyway'
        },
        ACTIONS: {
            addResponders: 'Add responders',
        }
    }
}

export default STRINGS
