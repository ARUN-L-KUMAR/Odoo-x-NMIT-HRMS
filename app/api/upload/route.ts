import { NextRequest } from "next/server";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { errorResponse } from "@/lib/utils";

// POST /api/upload — upload image to Cloudinary (folder: "HRMS")
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "HRMS";

    if (!file) {
      return errorResponse("VALIDATION_ERROR", "No image file provided", {}, 400);
    }

    // Validate mime type
    if (!file.type.startsWith("image/")) {
      return errorResponse("VALIDATION_ERROR", "Only image files are allowed", {}, 400);
    }

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return errorResponse("VALIDATION_ERROR", "Image size must be less than 5MB", {}, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadToCloudinary(buffer, folder);

    return Response.json({
      success: true,
      data: {
        url: result.url,
        publicId: result.publicId,
      },
      message: "Image uploaded successfully",
    });
  } catch (error: any) {
    console.error("[CLOUDINARY_UPLOAD]", error);
    return errorResponse("INTERNAL_ERROR", error.message || "Failed to upload image", {}, 500);
  }
}
