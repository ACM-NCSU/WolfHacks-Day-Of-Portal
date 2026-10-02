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

    // Day-of info for the portal's Overview tab, from the opening ceremony
    // deck. All copy lives here so organizers can edit it without touching
    // PortalOverview.jsx.
    dayOf: {
      tagline: '24 hours to turn an idea into a working project.',
      highlights: ['Free food', 'Gain practical experience', 'Build something awesome', 'Get help from mentors', 'Win prizes', 'Meet new people'],
      deadlines: [
        { when: 'Sat 11:00 AM', what: 'Hacking begins' },
        { when: 'Sat 8:00 PM', what: "Duke Energy Hall closes -- no overnight stays. Day 2 starts with breakfast at 9 AM." },
        { when: 'Sat 11:59 PM', what: 'Checkpoint: team members and track finalized on DevPost and in the portal (mandatory)' },
        { when: 'Sun 11:00 AM', what: 'DevPost submission due' },
        { when: 'Sun 12:30 PM', what: 'Judging starts: be at your table to demo' },
        { when: 'Sun 3:00 PM', what: 'Closing ceremony and winners' },
      ],
      roadmap: [
        { title: 'Team up & set up', text: 'Form your team, plan your track and project, join the Discord, and register on DevPost.' },
        { title: 'Build & learn', text: 'Start building, connect with mentors, and attend workshops and optional challenges.' },
        { title: 'Checkpoint', text: 'Have your track and team members finalized by 11:59 PM Saturday, on DevPost and in the portal. This is mandatory for submission.' },
        { title: 'Project submission', text: 'Complete your DevPost submission by 11:00 AM Sunday at the latest. Start early!' },
        { title: 'Judging', text: 'Set up at your table during the judging window and pitch your project.' },
        { title: 'Closing ceremony', text: "Cheer on everyone and find out if you've won a prize." },
      ],
      rules: [
        'No previously existing work can be used for submissions.',
        'Projects must be submitted on DevPost by 11:00 AM Sunday to be considered.',
        'Teams must be present to demo their projects to judges at 12:30 PM Sunday.',
        'Cite AI usage properly in a README in your GitHub repository.',
        'Every team participates in one, and only one, track.',
        'Teams must have at least 2 people and no more than 4.',
      ],
      competitions: [
        { name: 'Beginner competition', eligibility: 'WolfHacks 2026 must be the first hackathon for at least half of your teammates.', prize: 'JBL Charge 6 portable Bluetooth speaker' },
        { name: 'General competition', eligibility: 'All other teams.', prize: 'Apple AirPods' },
      ],
      staff: [
        { look: 'WolfHacks staff shirt', who: 'Organizers', swatch: 'var(--red)' },
        { look: 'Purple lanyard', who: 'Mentors', swatch: '#8b3fd6' },
        { look: 'Yellow lanyard', who: 'Judges', swatch: '#e6c619' },
      ],
      resources: [
        { name: 'WolfHacks Discord', what: 'Talk to organizers and get important announcements.' },
        { name: 'WolfHacks Portal', what: 'Form your team, pick your track, find event info, and check in for meals.' },
        { name: 'DevPost', what: 'Submit your project.' },
      ],
      sponsors: ['Databricks', 'STMicroelectronics', 'NC State Applied AI Initiative', 'Kenan Institute for Engineering, Technology & Science', 'Center for Geospatial Analytics', 'Institute for Advanced Analytics'],
      acmPartners: ['Fidelity Investments', 'NetApp', 'SMBC', 'Direct Supply', 'Eaton'],
    },

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
          question: 'Where is the event, and can I stay overnight?',
          answer:
            "Duke Energy Hall, NC State University, Raleigh, NC. The event is in person. Parking is free on Centennial Campus from 5 PM Friday to 7 AM Monday. Overnight stays aren't available: Duke Energy Hall closes at 8 PM Saturday, so plan to head home for the night and come back for breakfast at 9 AM Sunday.",
        },
        {
          question: 'Will you reimburse travel costs?',
          answer:
            "We're unable to provide reimbursement for travel or other costs incurred to reach the event.",
        },
        {
          question: 'What kind of activities will there be?',
          answer:
            'Saturday starts with check-in and a sponsorship fair at 9 AM, the opening ceremony at 10 AM, team formation at 10:30, and hacking from 11 AM. Expect MLH workshops, mentor check-ins, and meals throughout. Projects are due on DevPost at 11 AM Sunday, judging starts at 12:30 PM, and the closing ceremony is at 3 PM. The full live schedule is in the day-of portal.',
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

    // Finalized 2026 track list. Slugs are the stable identifier stored on a
    // team (see TrackChallengePicker.jsx) -- never change them; name/copy are
    // safe to edit freely. Every field below `description` is optional and
    // only rendered by TracksPage.jsx. `prizes` is ordered 1st, 2nd, 3rd.
    tracks: [
      {
        slug: 'geospatial-analytics',
        name: 'Center for Geospatial Analytics',
        description:
          'Location matters! Understanding where things happen and how people and places are connected can reveal patterns of impact, identify who and what is affected, and help target action where it matters most.',
        problemStatement:
          'Use geospatial data (data linked to geographic locations) to understand a pressing societal or environmental issue, and develop a software solution that helps determine where to take action.',
        technologiesLabel: 'Tools',
        technologies: ['GeoPandas', 'QGIS', 'Leaflet', 'MapLibre', 'deck.gl', 'Kepler.gl', 'Shapely', 'OSMnx', 'Folium', 'Mapbox'],
        datasets: 'OpenStreetMap, Overpass API, US Census, Census TIGER/Line, NC OneMap, Data.gov, NOAA, USGS, EPA.',
        prizes: ['Amazon Echo Show 5 smart display', 'Royal Kludge RK68 wireless mechanical keyboard', 'Logitech G203 gaming mouse'],
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
        technologies: ['Databricks', 'Python', 'SQL', 'AI/ML', 'LLMs', 'agentic AI'],
        datasets: 'Wearable datasets containing multiple sessions will be provided.',
        prizes: ['Fujifilm Instax Mini 12 instant camera', 'ELEGOO UNO R3 Super Starter Kit', 'Anker 10,000mAh power bank'],
      },
      {
        slug: 'applied-ai-hardware',
        name: 'Applied AI Hardware',
        description:
          'Build IoT and edge-AI solutions using the STMicroelectronics SensorTile.box development board to collect, analyze, and act on real-world sensor data.',
        ideas: [
          'Develop a wearable use case that tracks motion and/or audio.',
          'Build a model that detects patterns or anomalies in sensor data.',
          'Deploy an ML model to the IoT or edge devices.',
        ],
        technologies: ['STMicroelectronics hardware', 'Raspberry Pi', 'IoT Cloud', 'Python', 'ML/AI'],
        prizes: ['Acer 27" 120Hz gaming monitor', 'HyperX Cloud Stinger 2 Core gaming headset'],
      },
      {
        slug: 'applied-ai-challenge',
        name: 'Applied AI Data Streaming Challenge',
        description:
          'This challenge is an extension of the other two Applied AI tracks. Add real-time data streaming to your project from either the Databricks track or the IoT track. To participate in this challenge, stream data into Databricks instead of using a dataset, or build a real-time interface around IoT sensor data.',
      },
      {
        slug: 'advanced-analytics',
        name: 'Institute for Advanced Analytics',
        description:
          'Students juggle deadlines across calendars, syllabi, and course sites, while study materials are scattered across PDFs, slides, and notes. Build an AI-powered dashboard that brings these resources together to help students organize their workload, prepare for exams, and understand their academic progress.',
        paragraphs: [
          'Your solution might include calendar integration, AI-generated practice questions, flashcards, study plans, progress tracking, or other features that help students study more effectively. Design an experience that makes it easier for students to understand what they need to do, what they need to study, and where they may need additional support.',
        ],
        dataScienceComponent: [
          'Every team will train a decision tree model using a synthetic end-of-semester student dataset provided by WolfHacks. Use the model to predict whether a student is at risk of finishing a course with a D or F, then explore how those predictions could support students through your dashboard.',
          'Teams should evaluate their model, explain what it learns, and consider how its predictions could translate into useful, actionable study advice. Teams should use a held-out split and test their model on the held-out portion of the data set.',
        ],
        goal: 'The goal is to combine creative product development, AI, and data science to build tools that help students succeed.',
        prizes: ['Logitech G502 X gaming mouse', 'JBL Go 4 portable Bluetooth speaker', 'HyperX Cloud Stinger 2 Core gaming headset'],
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
