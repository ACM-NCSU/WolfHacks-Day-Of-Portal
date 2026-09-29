import { useState } from 'react';

const DISMISS_KEY = 'wolfhacks_dismissed_announcement_id';

// Surfaces the single latest announcement across every portal section (not
// just the Announcements page), so organizers don't rely on participants
// happening to check that tab. Dismissal is per-announcement -- closing this
// one only hides it until a newer announcement is posted, at which point it
// reappears for everyone.
export default function AnnouncementBanner({ announcements }) {
  const latest = announcements[0];
  const [dismissedId, setDismissedId] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY);
    } catch {
      return null;
    }
  });

  if (!latest || latest.id === dismissedId) return null;

  function dismiss() {
    setDismissedId(latest.id);
    try {
      localStorage.setItem(DISMISS_KEY, latest.id);
    } catch {
      // Private browsing / storage blocked -- the banner just won't stay
      // dismissed across reloads, which is fine.
    }
  }

  return (
    <div className="announcement-banner" role="status">
      <div className="container announcement-banner__inner">
        <span className="announcement-banner__label">Announcement</span>
        <span className="announcement-banner__message">{latest.message}</span>
        <button
          type="button"
          className="announcement-banner__dismiss"
          onClick={dismiss}
          aria-label="Dismiss announcement"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
