import { NextResponse } from "next/server";
import { uploadImage } from "@/core/platform/uploadthing";
import { getUserFromCookie } from "@/core/platform/auth";
import { requireAnyPermission } from "@/core/platform/permissions";

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

export async function POST(req) {
  try {
    const forbidden = await requireAnyPermission(await getUserFromCookie(), ["canCreateProducts", "canEditProducts"]);
    if (forbidden) return forbidden;

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (!file.type?.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Image must be 8MB or smaller." }, { status: 400 });
    }

    const { url } = await uploadImage(file);
    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Image upload failed." },
      { status: 500 }
    );
  }
}
