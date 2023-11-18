import express, { Express, Response as ExResponse, Request as ExRequest } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

export class ProxyServer {
    private app: Express;

    constructor(
        public readonly port: number,
        public readonly targetServer: string,
    ) {
        this.app = express();
        this.app.use(cookieParser());
        this.app.use(express.json());
        this.app.use(cors({ origin: true, credentials: true }));
    }

    static create(port: number, targetServer: string) {
        const instance = new ProxyServer(port, targetServer);
        instance.build();
        return instance;
    }

    private static getBody(request: ExRequest){
        const contentType = request.headers["content-type"];

        if (contentType){
            if (contentType === "application/json"){
                return JSON.stringify(request.body);
            }

            return request.body.toString();
        }

        return null
    }

    private convertRequest(request: ExRequest) {
        return {
            url: this.targetServer + request.url,
            config: {
                credentials: "include" as RequestCredentials,
                headers: { "content-type": request.headers["content-type"]!, cookie: request.headers["cookie"]! },
            },
        };
    }

    private static async convertResponses(input: Response, output: ExResponse) {
        for (const [name, value] of input.headers) {
            output.setHeader(name, value);
        }

        const setCookieHeader = input.headers.get("set-cookie");
        if (setCookieHeader) {
            const cookies = input.headers
                .get("set-cookie")!
                .split("e, ")
                .map((x) => (x.endsWith("e") ? x : x + "e"))
                .reverse();
            output.setHeader("set-cookie", cookies);
        }

        let data;

        try {
            data = await input.json();
        } catch (e: any) {
            if (e.message === "Unexpected end of JSON input") {
                try {
                    data = await input.text();
                } catch (e: any) {
                    if (e.message === "Body is unusable") {
                        data = null;
                    }
                }
            }
        }

        output.send(data);
    }

    private async GET(request: ExRequest, response: ExResponse) {
        const c = this.convertRequest(request);
        await ProxyServer.convertResponses(await fetch(c.url, c.config), response);
    }

    private async DELETE(request: ExRequest, response: ExResponse) {
        const c = this.convertRequest(request);
        await ProxyServer.convertResponses(
            await fetch(c.url, {
                method: "DELETE",
                ...c.config
            }),
            response,
        );
    }

    private async POST(request: ExRequest, response: ExResponse) {
        const c = this.convertRequest(request);
        await ProxyServer.convertResponses(
            await fetch(this.targetServer + request.url, {
                method: "POST",
                body: ProxyServer.getBody(request),
                ...c.config
            }),
            response,
        );
    }


    private async PATCH(request: ExRequest, response: ExResponse) {
        const c = this.convertRequest(request);
        await ProxyServer.convertResponses(
            await fetch(this.targetServer + request.url, {
                method: "PATCH",
                body: ProxyServer.getBody(request),
                ...c.config
            }),
            response,
        );
    }

    private async PUT(request: ExRequest, response: ExResponse) {
        const c = this.convertRequest(request);
        await ProxyServer.convertResponses(
            await fetch(this.targetServer + request.url, {
                method: "PUT",
                body: ProxyServer.getBody(request),
                ...c.config
            }),
            response,
        );
    }

    private build() {
        this.app.get("/ping", (_, response: ExResponse) => {
            response.send("pong");
        });

        this.app.get("*", async (request: ExRequest, response: ExResponse) => {
            await this.GET(request, response);
        });

        this.app.patch("*", async (request: ExRequest, response: ExResponse) => {
            await this.PATCH(request, response);
        });

        this.app.post("*", async (request: ExRequest, response: ExResponse) => {
            await this.POST(request, response);
        });

        this.app.put("*", async (request: ExRequest, response: ExResponse) => {
            await this.PUT(request, response);
        });

        this.app.delete("*", async (request: ExRequest, response: ExResponse) => {
            await this.DELETE(request, response);
        });
    }

    public async start() {
        return this.app.listen(this.port, () => console.log("Proxy service has successfully started"));
    }
}
