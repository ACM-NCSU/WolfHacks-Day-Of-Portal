const siteConfig = {
  seo: {
    title: 'WolfHacks: a student hackathon at NC State',
    description:
      'WolfHacks is a fall hackathon at NC State hosted by ACM. Open to all majors and skill levels. Workshops, sponsor networking, and free food. Build a project in 24 hours.',
  },

  event: {
    name: 'WolfHacks',
    date: 'Oct 3-4, 2026',
    location: 'Centennial Campus, Raleigh, NC',
    countdownTarget: '2026-10-03T09:00:00',

    acm: {
      name: 'ACM at NC State',
      url: 'https://acm-ncsu.github.io/about/',
    },

    // MLH trust badge, same mechanism as the original boilerplate template.
    // year/color "2017"/"white" is the only combo that currently resolves to a
    // real image at MLH's asset host (verified directly). It's their generic
    // demo badge, not tied to a real date. Region "na" is correct for NC State.
    // Swap these once you generate your real badge from MLH's organizer dashboard.
    trustBadge: {
      year: '2017',
      region: 'na',
      color: 'white',
    },

    hero: {
      eyebrowPrefix: 'ACM AT NC STATE',
      subhead:
        "WolfHacks is a fall hackathon brought together by ACM at NC State, where students come together to build something in one weekend. It's open to all majors and all skill levels. You'll have access to workshops, sponsor networking, mentors, and yes, free food. All you have to do is build a project in 24 hours.",
      registerNote:
        "Registration isn't open yet. Fill out this quick form to let us know you're interested, and we'll notify you the moment it goes live.",
      // TODO: replace with your real pre-registration form URL (Google Form, Typeform, etc.)
      preRegisterUrl: 'https://forms.gle/m3jiVcFZdRRo2tLo8',
      // TODO: once the WolfHacks logo is ready, drop the file in public/images/
      // and set this to its filename (e.g. 'images/wolfhacks-logo.png'). It will
      // appear next to the ACM badge automatically — the space is already reserved.
      logoUrl: null,
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
          question: 'Do I need a team, or experience, to apply?',
          answer:
            "No to both. You can apply solo and form a team at the event, and total beginners are welcome — there will be workshops and mentors all weekend. Teams should be between 2 and 4 people, and we'll have a team-building activity right after opening ceremony if you'd like to find teammates.",
        },
        {
          question: 'Where is the event, and do I have to stay overnight?',
          answer:
            "Centennial Campus, NC State University, Raleigh, NC. The event is in person. Exact building and room details go out closer to the event. Parking is free on Centennial Campus from 5 PM Friday to 7 AM Monday. You don't have to stay overnight — you're welcome to leave and come back if you'd prefer.",
        },
        {
          question: 'What kind of activities will there be?',
          answer:
            'We will post the schedule closer to the event. There will be workshops and activities to take a break and meet other hackers and our wonderful sponsors.',
        },
        {
          question: 'Are you sending out acceptances? Is there a deadline to apply?',
          // TODO: fill in the actual number of days before the event acceptances go out.
          answerBefore:
            'We will send out acceptances a few days before the event. If you need earlier confirmation to book travel, please reach out to our team at ',
          link: { text: 'acmchapter-org@ncsu.edu', url: 'mailto:acmchapter-org@ncsu.edu' },
          answerAfter: '. Applications will close once we reach the maximum amount of hackers we can support.',
        },
        {
          question: 'I have a different question!',
          answerBefore: 'Email us at ',
          link: { text: 'acmchapter-org@ncsu.edu', url: 'mailto:acmchapter-org@ncsu.edu' },
          answerAfter: '!',
        },
      ],
    },

    registerThanksMessage: "You'll receive more information closer to the hackathon.",
  },
};

export default siteConfig;
