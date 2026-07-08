import { v2 as cloudinary } from "cloudinary";
import { env } from "@careergps/env/server";
import { randomUUID } from "crypto";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(buffer: Buffer, folder = "uploads") {
  const dataUri = `data:application/octet-stream;base64,${buffer.toString("base64")}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    public_id: randomUUID(),
    resource_type: "image",
  });
  return { url: result.secure_url as string, publicId: result.public_id as string };
}

export async function deleteFromCloudinary(publicId: string) {
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}

export default cloudinary;
