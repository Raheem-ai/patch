const STRINGS = {

    // GLOBAL
    responders: (n: number) => n > 1 ? 'responders' : 'responder',

    REQUESTS: {
        NOTIFICATIONS: {
            notifyNResponders: (n: number) => `Notify ${n} ${STRINGS.responders(n)}`,
            notifyPeople: 'Notify people',
        },
        TOGGLE: {
            toggleRequest: (isOpen: boolean) => isOpen ? 'Close this request' : 'Re-open this request',
            TITLE: 'Type of request',
            MESSAGE: `Are you sure you want to close this request without specifying its type?`,
            ADD: 'Add now',
            CLOSE: 'Close anyway'
        }
    }
}

export default STRINGS
