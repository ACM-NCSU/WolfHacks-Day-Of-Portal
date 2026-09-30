// Single source of truth for the portal's nav tabs. Each feature branch
// (team dashboard, live schedule, announcements) replaces its section's
// placeholder card in PortalShell with the real page -- the id/path/label
// here is what wires it into the shell's nav. A hacker's own check-in status
// isn't a tab -- it's shown as a badge in the header instead (see
// PortalShell.jsx). `organizerOnly` hides a tab from the nav for non-
// organizers; `hackerOnly` does the reverse (organizers don't need a team to
// hack on). Both CheckInSection and TeamDashboard also gate their own
// content as defense in depth against someone hitting the URL directly.
const PORTAL_SECTIONS = [
  {
    id: 'schedule',
    path: '/portal/schedule',
    label: 'Schedule',
    eyebrow: 'LIVE SCHEDULE',
    heading: "What's happening right now.",
    note: 'Will connect to the live schedule feed (feature/live-schedule).',
  },
  {
    id: 'team',
    path: '/portal/team',
    label: 'Team',
    eyebrow: 'TEAM DASHBOARD',
    heading: 'Your team.',
    note: 'Will connect to the team dashboard (feature/team-dashboard).',
    hackerOnly: true,
  },
  {
    id: 'checkin',
    path: '/portal/checkin',
    label: 'Staff Check-In',
    eyebrow: 'STAFF ONLY',
    heading: 'Event check-in.',
    note: 'Search a registrant and confirm they are checked in.',
    organizerOnly: true,
  },
  {
    id: 'announcements',
    path: '/portal/announcements',
    label: 'Announcements',
    eyebrow: 'ANNOUNCEMENTS',
    heading: 'Updates from organizers.',
    note: 'Will connect to organizer announcements (feature/announcements).',
  },
  {
    id: 'meals',
    path: '/portal/meals',
    label: 'Meals',
    eyebrow: 'MEALS',
    heading: 'Show this at the food table.',
    note: 'Scan a hacker\'s meal QR code to see their dietary restrictions.',
  },
];

export default PORTAL_SECTIONS;
