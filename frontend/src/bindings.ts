import container from "./di";
import { IUserStore } from "./interfaces";
import UserStore from "./stores/UserStore";

container.bind(IUserStore.id).to(UserStore);