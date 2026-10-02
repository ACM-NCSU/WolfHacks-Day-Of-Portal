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
    // Both targets carry an explicit Eastern (EDT, -04:00) offset -- without
    // one, a device in another time zone would count down to the wrong moment.
    countdownTarget: '2026-10-03T09:00:00-04:00',
    // Drives the "time left in the hackathon" timer on the portal overview
    // page. Matches "Competition Begins" (Day 1, 11:00) through "Project
    // Submissions Due" (Day 2, 11:00) on the real schedule -- see
    // backend/repository.py's _seed_schedule -- i.e. the actual 24-hour
    // building window, not the whole two-day event.
    hackathonEndTarget: '2026-10-04T11:00:00-04:00',

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
      preRegisterUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfVB5eG-ZD8I3EEUlYpEZzlQDA5_FBwCq3Noicah8exDBY4Yw/viewform',
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

    // Real 2026 track list, one per sponsor challenge. Slugs are the stable
    // identifier stored on a team (see TrackChallengePicker.jsx); name/
    // description/etc are safe to edit freely. The richer fields (ideas,
    // technologies, datasets, coreChallenge, dataScienceComponent) are
    // optional and only rendered by TracksPage.jsx -- omit any that don't
    // apply to a given track.
    tracks: [
      {
        slug: 'geospatial-analytics',
        name: 'Center for Geospatial Analytics',
        description:
          'Location matters! Use geospatial data to understand a pressing societal or environmental issue and help target action where it matters most.',
        problemStatement:
          'Use geospatial data (data linked to geographic locations) to understand a pressing societal or environmental issue, and develop a software solution that helps determine where to take action.',
      },
      {
        slug: 'applied-ai-software',
        name: 'Applied AI Software (Databricks)',
        description:
          'Build innovative software applications that leverage the Databricks platform and agentic AI to solve real-world problems for a wearable application with streaming data.',
        ideas: [
          'Create an AI agent that analyzes data and provides actionable insights.',
          'Build an application that allows users to interact with and explore complex datasets using AI.',
          'Develop an agentic system that can use tools, data, and APIs to complete multi-step tasks.',
        ],
        technologies: ['Databricks', 'Python', 'SQL', 'AI/ML', 'LLMs', 'Agentic AI'],
        datasets: 'Wearable datasets containing multiple sessions will be provided.',
      },
      {
        slug: 'applied-ai-hardware',
        name: 'Applied AI Hardware',
        description:
          'Build IoT and edge-AI solutions using the STMicroelectronics SensorTile.box development board to collect, analyze, and act on real-world sensor data.',
        ideas: [
          'Develop a wearable use case that tracks motion and/or audio.',
          'Build a model that detects patterns or anomalies in sensor data.',
          'Deploy an ML model to IoT or edge devices.',
        ],
        technologies: ['STMicroelectronics hardware', 'Raspberry Pi', 'IoT Cloud', 'Python', 'ML/AI'],
      },
      {
        slug: 'applied-ai-challenge',
        name: 'Applied AI Challenge',
        description:
          'Connect IoT wearables to an intelligent dashboard hosted on Databricks -- an end-to-end solution that turns real-time sensor data into actionable insights. Functions as a combination of the Applied AI Software and Applied AI Hardware tracks.',
        ideas: [
          'Stream wearable data into Databricks.',
          'Build a dashboard for real-time data visualization.',
          'Use AI or analytics to identify trends, anomalies, or insights.',
        ],
        coreChallenge: 'How can real-time IoT data be transformed into actionable insights using Databricks?',
      },
      {
        slug: 'advanced-analytics',
        name: 'Institute for Advanced Analytics',
        description:
          'Students juggle deadlines across calendars, syllabi, and course sites, while study materials are scattered across PDFs, slides, and notes. Build an AI-powered dashboard that brings these resources together to help students organize their workload, prepare for exams, and understand their academic progress.',
        ideas: [
          'Calendar integration',
          'AI-generated practice questions and flashcards',
          'Study plans and progress tracking',
        ],
        dataScienceComponent:
          "Every team trains a decision tree model on a synthetic end-of-semester student dataset (provided by WolfHacks) to predict whether a student is at risk of finishing a course with a D or F. Teams should use a held-out split, test on the held-out portion, evaluate the model, explain what it learns, and consider how its predictions could translate into actionable study advice.",
      },
    ],

    // MLH prize categories. Unlike tracks (one per team), teams can opt into
    // as many of these as they want -- stored on the team as challenge_slugs.
    // Slugs must match CHALLENGE_SLUGS in backend/teams.py exactly.
    challenges: [
      {
        slug: 'mlh-elevenlabs',
        name: 'Best Use of ElevenLabs',
        prize: 'Wireless earbuds',
        description:
          'Deploy natural, human-sounding audio with ElevenLabs. Create realistic, dynamic, and emotionally expressive voices for any project, from interactive AI companions to narrated stories and voice-enabled apps -- no actors or complex audio production needed. Give your project a voice for a chance to win wireless earbuds!',
      },
      {
        slug: 'mlh-gemini',
        name: 'Best Use of Gemini API',
        prize: 'MLH swag kits',
        description:
          "Push the boundaries of what's possible with AI using Google Gemini. Build a chatbot that gives personalized advice, an app that summarizes complex research papers, or generate creative content like code, scripts, and music. What will you build with the Gemini API this weekend?",
      },
      {
        slug: 'mlh-solana',
        name: 'Best Use of Solana',
        prize: 'SenseCAP Card Tracker',
        description:
          'Solana is a network built for fast execution and near-zero transaction costs. Create a game, social app, or consumer product built on instant, high-frequency transactions; design a trading, lending, or decentralized exchange (DEX); or prototype supply chain, identity, or payments that can handle real-world volume. Prizes for you and each member of your team!',
      },
      {
        slug: 'mlh-tiger-data',
        name: 'Best Use of Tiger Data',
        prize: 'Stream Deck Mini',
        description:
          'Tiger Data extends PostgreSQL into an ultra-fast foundation for real-time data, time-series metrics, and complex analytics: standard SQL, relational and metric data in one database, real-time dashboards via Continuous Aggregates, and 90%+ compression on free-tier instances. The most innovative, impactful, and performance-driven use of Tiger Data wins -- think real-time IoT monitoring, AI-driven analytics dashboards, or financial prediction engines.',
      },
      {
        slug: 'mlh-godaddy-domain',
        name: 'Best Domain Name from GoDaddy Registry',
        prize: 'Digital gift card',
        description: 'Register your domain name with GoDaddy Registry for a chance to win some amazing prizes!',
      },
    ],

    // Judging rubric shown on the portal's Tracks tab. `general` applies to
    // every team; `iaa` is additional criteria specific to the Institute for
    // Advanced Analytics track (its dashboard has a data-science component
    // the generic rubric doesn't cover).
    judging: {
      general: [
        { label: 'Track', description: 'How well does the project address the problem statement and goals of the chosen track?' },
        { label: 'Technology', description: 'How technically impressive is the project? Consider the difficulty of the technical challenges, creative use of technology, and how effectively different components work together. Did the technology make you say "Wow"?' },
        { label: 'Design', description: 'How thoughtfully designed is the project for its intended users? Consider usability, interface design, accessibility, and the overall user experience.' },
        { label: 'Execution', description: 'Does the hack work? Consider how much of the proposed solution was actually implemented, reliability, and how effectively the team executed its idea.' },
      ],
      iaa: [
        { label: 'Track', description: 'How effectively does the solution support students in managing their workload, preparing for exams, and understanding their academic progress.' },
        { label: 'Impact', description: "How useful is the project for its intended users? Consider whether the model's predictions and study recommendations provide actionable support that a student could realistically use." },
        { label: 'Modeling', weighted: true, description: 'How effectively did the team develop and evaluate its decision tree model? Consider data cleaning, testing on held-out data, recall, overfitting, and comparison against the baseline.' },
        { label: 'Communication', description: "How clearly does the team communicate its solution and technical approach? Consider the quality of the demo, visualizations, and plain-language explanation of the model's decisions." },
        { label: 'Responsible AI', description: 'How thoughtfully does the team address responsible AI? Consider whether limitations are acknowledged, privacy is protected, AI use is disclosed, and risk flags are presented in a way that supports rather than discourages students.' },
      ],
    },
  },
};

export default siteConfig;
