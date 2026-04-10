"use client";

import { createSupabaseBrowserAuthClient, isAuthConfigured } from "@/lib/supabase/auth";

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const allowedMimeToExtension: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif"
};

export function getStorageBucketName() {
  return process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "produtos";
}

export async function uploadProductImage(file: File) {
  if (!(file.type in allowedMimeToExtension)) {
    throw new Error("Formato de imagem nao permitido.");
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("Imagem excede o limite de 5 MB.");
  }

  if (!isAuthConfigured()) {
    const extension = allowedMimeToExtension[file.type] ?? "jpg";
    return {
      publicUrl: URL.createObjectURL(file),
      path: `demo/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
    };
  }

  const supabase = createSupabaseBrowserAuthClient();
  if (!supabase) {
    throw new Error("Supabase nao configurado para upload.");
  }

  const extension = allowedMimeToExtension[file.type] ?? "jpg";
  const path = `produtos/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const bucket = getStorageBucketName();

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return {
    publicUrl: data.publicUrl,
    path
  };
}
