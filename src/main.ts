import { ProxyServer } from "./proxy.server";

const PORT = 3003;
const PROXY_TARGET = "https://noma.rent";

async function main() {
    const server = ProxyServer.create(PORT, PROXY_TARGET);
    await server.start();
}

main();
