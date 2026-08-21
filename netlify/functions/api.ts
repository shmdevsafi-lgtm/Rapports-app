import serverless from "serverless-http";

import { createServer } from "../../server";

const expressHandler = serverless(createServer());

export const handler = (event: any, context: any) => {
  const headers = {
    ...(event.headers || {}),
    "content-type": event.headers?.["content-type"] || event.headers?.["Content-Type"] || "application/json",
  };
  const body = event.isBase64Encoded && typeof event.body === "string"
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  return expressHandler({ ...event, headers, body }, context);
};
