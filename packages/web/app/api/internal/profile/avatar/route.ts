import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/app/lib/auth/auth-options";
import { getStorageProvider } from "@/app/lib/storage";
import { v4 as uuidv4 } from "uuid";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// Map content types to file extensions
const EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

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

    // Read the file as a buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate a unique filename with the user's ID for easier management
    const extension = EXTENSION_MAP[file.type] || "jpg";
    const filename = `${session.user.id}-${uuidv4()}.${extension}`;

    // Upload using the appropriate storage provider
    const storage = getStorageProvider();
    const result = await storage.upload(buffer, filename, file.type, "avatars");

    return NextResponse.json({
      success: true,
      avatarUrl: result.url,
    });
  } catch (error) {
    console.error("Failed to upload avatar:", error);
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 }
    );
  }
}
