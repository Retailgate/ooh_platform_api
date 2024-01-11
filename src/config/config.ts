import { load } from 'ts-dotenv';

export const env = load({ 
    PORT: Number, 
    HOST: String,
    DB_USER: String,
    PASSWORD: String,
    DATABASE: String,
    SLACK_TOKEN: String,
    TOKEN_SECRET: String,
    PG_HOST: String,
    PG_DB_USER: String,
    PG_PASSWORD: String,
    PG_DATABASE: String

}); 
