import { FileAudio, FileText, FileVideo, Image as ImageIcon, type LucideIcon } from "lucide-react";

/** Picks a representative icon for a file based on its MIME type family. */
export function fileIcon(mimeType: string): LucideIcon {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (mimeType.startsWith("video/")) return FileVideo;
  return FileText;
}
