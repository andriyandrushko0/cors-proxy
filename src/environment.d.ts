declare namespace NodeJS {
    export interface ProcessEnv {
        readonly PORT: string;
        readonly SERVER_URI: string;
    }
}
