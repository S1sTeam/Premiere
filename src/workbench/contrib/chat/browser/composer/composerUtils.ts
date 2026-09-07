import { basename } from "@/base/common/paths";

export { basename };

let attachIdSeq = 0;
export const newAttachId = (): string => `a${++attachIdSeq}-${Date.now().toString(36)}`;

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;

import type { Attachment } from "../../common/chat";

export function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function fileToAttachment(file: File): Promise<Attachment | null> {
  const isImage = IMAGE_RE.test(file.name) || file.type.startsWith("image/");
  if (isImage) {
    try {
      const dataUrl = await fileToDataUrl(file);
      return {
        id: newAttachId(),
        kind: "image",
        name: file.name,
        dataUrl,
        sizeBytes: file.size,
      };
    } catch {
      // fallback to file attachment
    }
  }

  let content: string | undefined;
  if (file.size <= 5 * 1024 * 1024) {
    try {
      content = await file.text();
    } catch {
      // binary or unreadable as utf-8
    }
  }

  const anyFile = file as File & { path?: string };
  return {
    id: newAttachId(),
    kind: "file",
    name: file.name,
    path: anyFile.path,
    sizeBytes: file.size,
    content,
  };
}
