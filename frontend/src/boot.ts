import { bindDBs, initDBs } from "./dbs";
import { bindServices, initServices } from "./services";
import { bindStores, initStores } from "./stores";
import { notificationStore } from "./stores/interfaces";

export default function (doneLoading: () => void) {
    bindStores();
    bindServices();
    bindDBs();

    // setup notifications for both foreground/background scenarios
    notificationStore().setup();

    (async () => {
        try {
            await Promise.all([
                initStores(),
                initServices(),
                initDBs()
            ]);

            console.log('Successfuly initialized stores')
        } catch (e) {
            console.error('Error during initialization:', e)
        } finally {
            doneLoading()
        }
    })()

    return () => {
        notificationStore().teardown();
    }
}