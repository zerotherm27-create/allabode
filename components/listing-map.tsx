export function ListingMap({ location }: { location: string }) {
  if (!location) return null;
  const q = encodeURIComponent(location);
  return (
    <div className="mt-8">
      <h2 className="font-display text-xl font-semibold text-navy">Location</h2>
      <div className="mt-4 aspect-[16/9] w-full overflow-hidden border border-line">
        <iframe
          src={`https://www.google.com/maps?q=${q}&output=embed`}
          className="h-full w-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Map showing ${location}`}
        />
      </div>
    </div>
  );
}
