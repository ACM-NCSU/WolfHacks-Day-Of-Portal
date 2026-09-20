const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});

export default function AnnouncementList({ announcements, emptyMessage }) {
  if (announcements.length === 0) {
    return <p className="team-card__note">{emptyMessage}</p>;
  }

  return (
    <ul className="announcement-list">
      {announcements.map((announcement) => (
        <li className="announcement" key={announcement.id}>
          <p className="announcement__message">{announcement.message}</p>
          <p className="announcement__meta">
            {announcement.author_name} &middot; {timeFormatter.format(new Date(announcement.created_at))}
          </p>
        </li>
      ))}
    </ul>
  );
}
