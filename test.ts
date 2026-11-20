import { getSignedUrl } from "@aws-sdk/cloudfront-signer";
import * as config from "./src/config/config";
import { readFileSync } from "fs";

const domain = config.env.AWS_CLOUDFRONT_DOMAIN;
const keyPairId = config.env.AWS_CLOUDFRONT_PUBLIC_KEY;
const privateKey = readFileSync(
  config.env.AWS_CLOUDFRONT_PRIVATE_KEY_PATH,
  "utf8",
);

// Replace this with the exact S3 object key.
const objectKey = "sites/UN-5SCTGNS0001/ooh-test.jpg";

const url = getSignedUrl({
  url: `https://${domain}/${objectKey}`,
  keyPairId,
  privateKey,
  dateLessThan: new Date(Date.now() + 1 * 60 * 1000).toISOString(),
});

console.log(url);
