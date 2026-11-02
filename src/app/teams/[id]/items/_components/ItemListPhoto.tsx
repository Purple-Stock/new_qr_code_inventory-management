export function ItemListPhoto({
  name,
  photoData,
  noPhotoLabel,
}: {
  name: string;
  photoData: string | null | undefined;
  noPhotoLabel: string;
}) {
  if (photoData) {
    return (
      <img
        src={photoData}
        alt={name}
        className="h-14 w-14 rounded-xl object-cover border border-hairline bg-raised"
      />
    );
  }

  return (
    <div
      className="h-14 w-14 rounded-xl border border-dashed border-hairline bg-raised flex items-center justify-center text-[10px] leading-tight text-ink-3 text-center px-1"
      aria-label={noPhotoLabel}
    >
      {noPhotoLabel}
    </div>
  );
}
