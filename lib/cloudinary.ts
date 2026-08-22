import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dxo35vqwm",
  api_key: process.env.CLOUDINARY_API_KEY || "697554634925276",
  api_secret: process.env.CLOUDINARY_API_SECRET || "VE-UCdI__9qJCN7sEzxQhDYJwKM",
  secure: true,
});

export async function uploadToCloudinary(
  fileBuffer: Buffer,
  folder = process.env.CLOUDINARY_FOLDER || "HRMS",
  customPublicId?: string
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: customPublicId,
        resource_type: "image",
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error("Cloudinary upload failed"));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
}

export default cloudinary;
