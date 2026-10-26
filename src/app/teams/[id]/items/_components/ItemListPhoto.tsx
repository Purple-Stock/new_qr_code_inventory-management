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
        className="h-14 w-14 rounded-xl object-cover border border-gray-200 bg-gray-50"
      />
    );
  }

  return (
    <div
      className="h-14 w-14 rounded-xl border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-[10px] leading-tight text-gray-400 text-center px-1"
      aria-label={noPhotoLabel}
    >
      {noPhotoLabel}
    </div>
  );
}
