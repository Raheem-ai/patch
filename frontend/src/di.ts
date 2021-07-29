import "reflect-metadata"
import { Container, injectable } from "inversify";

const container = new Container();

export function getStore<T>({ id }: { id: symbol }): T {
    return container.get(id);
}

export function Store() {
    return function (ctr: new () => any) {
        return injectable()(ctr)
    }
}

export default container;