export function productImageUrl(url?: string | null, size = 800) {
  if (!url) {
    return "";
  }

  return url.replace(/tr:h-\d+,w-\d+,cm-pad_resize/, `tr:h-${size},w-${size},cm-pad_resize`);
}
