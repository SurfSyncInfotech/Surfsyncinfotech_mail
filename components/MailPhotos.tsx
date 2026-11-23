const shots = [
  ["/mail-together.jpg", "Two people reading mail on a laptop"],
  ["/mail-laptop.jpg", "A laptop open to a mailbox"],
  ["/mail-phone.jpg", "Mail open on a phone"],
  ["/mail-window.jpg", "Someone reading mail by a window"],
  ["/mail-desk.jpg", "A desk set up for the day's mail"],
  ["/mail-group.jpg", "A team around a table with a laptop"],
] as const;

export function MailPhotos({ className = "" }: { className?: string }) {
  return (
    <ul className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${className}`}>
      {shots.map(([src, alt]) => (
        <li key={src} className="overflow-hidden rounded-2xl border border-line bg-paper">
          <img src={src} alt={alt} className="aspect-[4/3] w-full object-cover" />
        </li>
      ))}
    </ul>
  );
}
