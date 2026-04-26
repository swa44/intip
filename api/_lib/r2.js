const {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { loadEnv } = require("./env");

const NOTES_KEY = "app/notes.json";
const FILES_KEY = "app/files.json";

function getClient() {
  loadEnv();
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    throw new Error("R2 credentials are not configured.");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

function bucket() {
  loadEnv();
  if (!process.env.R2_BUCKET_NAME) throw new Error("R2_BUCKET_NAME is not configured.");
  return process.env.R2_BUCKET_NAME;
}

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function readJson(key, fallback) {
  try {
    const result = await getClient().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    return JSON.parse(await streamToString(result.Body));
  } catch (error) {
    if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) return fallback;
    throw error;
  }
}

async function writeJson(key, value) {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: JSON.stringify(value, null, 2),
      ContentType: "application/json; charset=utf-8",
    }),
  );
}

async function signedPutUrl({ key, type }) {
  return getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
    }),
    { expiresIn: 60 * 10 },
  );
}

async function signedGetUrl({ key, name, type, inline = false }) {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ResponseContentType: type || "application/octet-stream",
      ResponseContentDisposition: `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(name)}"`,
    }),
    { expiresIn: 60 * 10 },
  );
}

async function deleteObject(key) {
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

function cleanFileName(name) {
  return String(name || "file")
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|#%{}^~[\]`]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140) || "file";
}

module.exports = {
  FILES_KEY,
  NOTES_KEY,
  cleanFileName,
  deleteObject,
  readJson,
  signedGetUrl,
  signedPutUrl,
  writeJson,
};
