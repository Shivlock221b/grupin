import { createAdminClient } from "@/lib/supabase-admin";

function sanitizeFileName(fileName: string) {
  return fileName.toLowerCase().replace(/[^a-z0-9.-]+/g, "-");
}

export async function uploadDealHeroImage(file: File, slug: string) {
  const supabase = createAdminClient();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;

  if (!supabase || !bucket) {
    throw new Error("Supabase storage is not configured");
  }

  const extension = file.name.split(".").pop() ?? "jpg";
  const path = `deal-heroes/${slug}-${Date.now()}.${sanitizeFileName(extension)}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
