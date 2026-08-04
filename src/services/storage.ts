import { supabase } from "@/integrations/supabase/client";

const BUCKET = "media";

/** Uploads to the private media bucket and returns a long-lived signed URL. */
export async function uploadFile(path: string, file: File): Promise<string> {
  const key = `${path}/${Date.now()}_${file.name.replace(/[^\w.-]/g, "_")}`;
  const { error } = await supabase.storage.from(BUCKET).upload(key, file, { upsert: true });
  if (error) throw new Error(error.message);
  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(key, 60 * 60 * 24 * 365);
  if (signError || !data) throw new Error(signError?.message ?? "Could not create file URL");
  return data.signedUrl;
}
