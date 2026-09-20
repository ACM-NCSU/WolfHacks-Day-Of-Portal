// Single source of truth for the portal's nav tabs. Each feature branch
// (team dashboard, live schedule, check-in, announcements) replaces its
// section's placeholder card in PortalShell with the real page -- the id/
// path/label here is what wires it into the shell's nav.
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
  },
  {
    id: 'checkin',
    path: '/portal/checkin',
    label: 'Check-in',
    eyebrow: 'EVENT CHECK-IN',
    heading: 'Confirm your registration.',
    note: 'Will connect to event check-in (feature/event-check-in).',
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
    note: 'Real QR code goes here once meal check-in is wired up.',
    qr: true,
  },
];

export default PORTAL_SECTIONS;
