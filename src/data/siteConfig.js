const siteConfig = {
  seo: {
    title: 'WolfHacks: a student hackathon at NC State',
    description:
      'WolfHacks is a fall hackathon at NC State hosted by ACM. Open to all majors and skill levels. Workshops, sponsor networking, and free food. Build a project in 24 hours.',
  },

  event: {
    name: 'WolfHacks',
    date: 'Oct 3-4, 2026',
    location: 'Duke Energy Hall, Raleigh, NC',
    countdownTarget: '2026-10-03T09:00:00',
    // Placeholder: 24 hours after countdownTarget, WolfHacks' usual hackathon
    // length. Drives the "time left in the hackathon" timer on the portal
    // overview page. Once the real day-of schedule is locked in, point this
    // at the actual closing-ceremony/submission-deadline timestamp instead.
    hackathonEndTarget: '2026-10-04T09:00:00',

    acm: {
      name: 'ACM at NC State',
      url: 'https://acm-ncsu.github.io/about/',
    },

    codeOfConduct:
      'https://github.com/yashovardhan/mlh-hackathon-organizer-guide/blob/e1f777578c8c5c905dcebc5b506c1f93f4c613b4/CONDUCT.md',

    hero: {
      eyebrowPrefix: 'ACM AT NC STATE',
      subhead:
        "WolfHacks is a fall hackathon brought together by ACM at NC State, where students come together to build something in one weekend. It's open to all majors and all skill levels. You'll have access to workshops, sponsor networking, mentors, and yes, free food. All you have to do is build a project in 24 hours.",
      // Hacker registration is closed. The portal's /apply route and backend
      // endpoint are left in place (still reachable directly) but nothing on
      // the landing page links to them anymore.
      registrationOpen: false,
      registerNote:
        "Hacker registration is now closed. Thank you to everyone who applied! Keep an eye on your inbox for acceptances and event details. We're still looking for judges and mentors, though.",
      preRegisterUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfVB5eG-ZD8I3EEUlYpEZzlQDA5_FBwCq3Noicah8exDBY4Yw/viewform',
      judgeMentorApplicationUrl: 'https://forms.gle/Ht3VhNoYPgfp3RUS8',
      // Two theme-matched variants: light art on a dark card for dark mode,
      // dark art on a light card for light mode. Hero.jsx renders both and
      // CSS swaps which is visible based on [data-theme], so there's no flash.
      logoUrlLight: 'images/lightmodelogo-transparent.png',
      logoUrlDark: 'images/darkmodelogo-transparent.png',
    },

    faq: {
      eyebrow: 'QUESTIONS',
      heading: 'FAQ',
      items: [
        {
          question: 'What is a hackathon, and why should I participate?',
          answer:
            "A hackathon is an invention marathon. Students team up to build a software or hardware project over 24 hours, from a blank slate to a working demo. It's very beginner friendly; you don't need to have hackathon experience, and there's no illegal or malicious hacking involved. You'll build something real in a weekend, learn skills that don't fit in a classroom, and meet people who like building things as much as you do. There are mentors and workshops if you want to learn something new, and it looks great on a resume even if you've never coded before.",
        },
        {
          question: 'How much does it cost?',
          answer: "Nothing. Attending WolfHacks is free, including meals for the weekend. We'll also have prizes for the winners.",
        },
        {
          question: 'Do I need to be a student to attend?',
          answer:
            'No. Anyone over the age of 18 is eligible to attend, whether or not you are a university student.',
        },
        {
          question: 'Do I need a team, or experience, to participate?',
          answer:
            "No to both. You can come solo and form a team at the event, and total beginners are welcome — there will be workshops and mentors all weekend. Teams should be between 2 and 4 people, and we'll have a team-building activity right after opening ceremony if you'd like to find teammates.",
        },
        {
          question: 'Where is the event, and do I have to stay overnight?',
          answer:
            "Duke Energy Hall, NC State University, Raleigh, NC. The event is in person. Parking is free on Centennial Campus from 5 PM Friday to 7 AM Monday. You don't have to stay overnight — you're welcome to leave and come back if you'd prefer.",
        },
        {
          question: 'Will you reimburse travel costs?',
          answer:
            "We're unable to provide reimbursement for travel or other costs incurred to reach the event.",
        },
        {
          question: 'What kind of activities will there be?',
          answer:
            'We will post the schedule closer to the event. There will be workshops and activities to take a break and meet other hackers and our wonderful sponsors.',
        },
        {
          question: 'Can I still register? When will I hear about acceptances?',
          answerBefore:
            "Hacker registration is closed because we've reached the number of hackers we can support. If you applied, we'll email acceptances a few days before the event. If you have questions about your application, reach out to our team at ",
          link: { text: 'acmchapter-org@ncsu.edu', url: 'mailto:acmchapter-org@ncsu.edu' },
          answerAfter: '.',
        },
        {
          question: 'I have a different question!',
          answerBefore: 'Email us at ',
          link: { text: 'acmchapter-org@ncsu.edu', url: 'mailto:acmchapter-org@ncsu.edu' },
          answerAfter: '!',
        },
      ],
    },

    sponsors: [
      {
        name: 'Institute for Advanced Analytics',
        logoUrl: 'images/sponsors/institute-for-advanced-analytics.png',
        // Sponsor's black wordmark is invisible on the dark theme's card, so
        // a recolored (black -> cream) variant swaps in there. See darkLogoUrl
        // usage in Sponsors.jsx.
        logoUrlDark: 'images/sponsors/institute-for-advanced-analytics-dark.png',
        url: 'https://analytics.ncsu.edu/',
      },
      {
        name: 'AI @ NC State',
        logoUrl: 'images/sponsors/ai-at-nc-state.png',
        logoUrlDark: 'images/sponsors/ai-at-nc-state-dark.png',
        url: 'https://ai.ncsu.edu/',
      },
      {
        name: 'Pure Buttons',
        logoUrl: 'images/sponsors/pure-buttons.png',
        url: 'https://www.purebuttons.com/',
      },
      {
        name: 'Kenan Institute for Engineering, Technology & Science',
        logoUrl: 'images/sponsors/KIETS-State-Logo.png',
        // White-lettered variant generated from KIETS-State-Logo.png for the
        // dark theme; the sponsor's own white version is the stacked layout.
        logoUrlDark: 'images/sponsors/kenan-institute-dark.png',
        url: 'https://kenan.ncsu.edu/',
      },
      {
        name: 'Center for Geospatial Analytics',
        logoUrl: 'images/sponsors/cgaBlack.png',
        logoUrlDark: 'images/sponsors/cgaWhite.png',
        url: 'https://cnr.ncsu.edu/geospatial/',
      },
    ],
    sponsorsMoreComingSoon: true,

    registerThanksMessage: "You'll receive more information closer to the hackathon.",

    // Placeholder content -- the real 2026 track/challenge list isn't final
    // yet. Slugs are the stable identifier stored on a team; name/description
    // are safe to edit freely.
    tracks: [
      { slug: 'open', name: 'Open Track', description: 'Build anything you want -- no theme required.' },
      { slug: 'ai-ml', name: 'AI / ML', description: 'Projects that meaningfully use machine learning or AI.' },
      { slug: 'sustainability', name: 'Sustainability', description: 'Projects tackling climate or environmental problems.' },
    ],

    challenges: [
      { slug: 'best-design', name: 'Best Design', description: 'Awarded for the most polished, thoughtful user experience.' },
      { slug: 'best-sponsor-api', name: 'Best Use of a Sponsor API', description: 'Awarded to the team that best integrates a sponsor API or tool.' },
      { slug: 'best-first-hack', name: 'Best First Hack', description: 'For teams made up entirely of first-time hackathon participants.' },
    ],
  },
};

export default siteConfig;
