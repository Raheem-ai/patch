import {bootstrap} from './bootstrap'

async function main() {
    const platform = await bootstrap();
    await platform.listen()
}

main()
.then(() => console.log('Startup complete!'))
.catch((e) => console.log('error: ', e))