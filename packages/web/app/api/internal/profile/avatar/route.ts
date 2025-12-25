import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, GIF, and WebP images are allowed" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Image must be smaller than 2MB" },
        { status: 400 }
      );
    }

    // TODO: Implement S3 upload
    // For now, return a placeholder avatar URL
    // In production, this would:
    // 1. Upload file to S3 bucket
    // 2. Return the S3 URL
    // 3. Update the user profile with the new avatar URL

    // Generate a placeholder URL using a hash of the user ID
    // This is a dummy implementation - replace with actual S3 upload
    const placeholderUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(session.user.name || session.user.email || session.user.id)}`;

    return NextResponse.json({
      success: true,
      avatarUrl: placeholderUrl,
      message: "Avatar upload is not yet implemented. Using placeholder avatar.",
    });
  } catch (error) {
    console.error("Failed to upload avatar:", error);
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 });
  }
}
