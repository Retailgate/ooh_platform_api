import { S3Client } from "@aws-sdk/client-s3";
import * as config from "./config";

const region = config.env.AWS_REGION;
const bucket = config.env.AWS_S3_BUCKET;
const accessKeyId = config.env.AWS_ACCESS_KEY;
const secretAccessKey = config.env.AWS_SECRET_KEY;

if (!region || !bucket) {
  throw new Error("Missing AWS S3 configuration");
}

export const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});
export const S3_BUCKET = bucket;
