// Central site content & settings. Copy is carried over verbatim from iraideas.com.

/** Main "Book An Appointment" destination: the Retirement Certainty Session page. */
export const BOOKING_URL = '/retirement-certainty-session/';

/** Cloudflare Turnstile site key (public). Leave empty to disable the widget. */
export const TURNSTILE_SITE_KEY = '';

export const site = {
  name: 'IRA Ideas LLC',
  tagline:
    'Providing clear legal guidance and education on self-directed IRAs and 401(k)s to help you invest confidently and stay compliant.',
  address: '2473 S Higley, 104-117 Gilbert, AZ 85295',
  addressLines: ['2473 S Higley, 104-117 Gilbert,', 'AZ 85295'],
  email: 'tim@iraideas.com',
  phone: '602-900-1855',
  phoneHref: 'tel:+16029001855',
  youtube: 'https://www.youtube.com/@TimBerryIRAAttorney',
  metaPixelId: '1412106300370234',
};

export const nav = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/#services' },
  { label: 'About', href: '/about-tim-berry/' },
  { label: 'Videos', href: '/videos-ira-401k/' },
  { label: 'Blog', href: '/blog/' },
  { label: 'Contact', href: '/get-in-touch-ira-401k-attorney/' },
];

export const services = [
  {
    title: 'Prohibited Transaction Analysis',
    body: 'We review <strong>Self-Directed IRA</strong> and <strong>Self-Directed 401(k)</strong> activity to help ensure transactions are handled correctly and do not trigger costly prohibited transaction violations.',
  },
  {
    title: 'Rollover Error Resolution',
    body: 'We correct <strong>rollover mistakes</strong> before they become serious issues. Custodians frequently report errors to the IRS — don’t risk penalties or the loss of your retirement account.',
  },
  {
    title: 'Reporting Error Correction',
    body: 'Missing Form <strong>5500-EZ</strong> filings or incorrect values on <strong>1099s</strong>? We identify reporting issues and help resolve them properly so you can move forward with confidence.',
  },
  {
    title: 'Retirement Estate Planning Strategy',
    body: 'We <strong>structure estate plans</strong> for retirement accounts to help ensure your assets transfer according to your wishes, not default rules or unintended government outcomes.',
  },
];

export const faqs = [
  {
    q: 'What services does Tim Berry provide?',
    a: 'My main focus is the various tax laws on retirement plans, in particular self directed IRAs and self directed 401ks, aka solo 401ks and owner only 401ks. I’m constantly fixing costly mistakes made by custodians, financial planners, and CPAs who haven’t dealt with self directed IRAs and 401ks.',
  },
  {
    q: 'What is a self-directed IRA and how is it different from a traditional IRA?',
    a: 'A self-directed IRA or self directed 401k is a retirement plan that allows you to make all the investments allowed by law. Most IRAs and 401ks limit you to stocks and bonds. With self directed plans the world is your oyster!',
  },
  {
    q: 'Can I roll over my existing IRA or 401(k) into a self-directed IRA?',
    a: 'Yes — you can generally transfer or roll over IRA funds (other than inherited IRAs and Roth IRAs) into a self directed 401k in a tax free manner.',
  },
  {
    q: 'Are there risks I should know about with self-directed IRAs?',
    a: 'Yes and no. There are a ton of hidden land mines for self directed 401ks and self directed IRAs. However if you just follow some simple rules. . . such as not having your plan engage in transactions with anyone related to you. . . then their operation can be relatively simple.',
  },
  {
    q: 'How can Tim Berry help me avoid prohibited transaction issues?',
    a: 'I can review and analyze your planned transactions and offer legal insight to ensure your self-directed IRA investments comply with IRS regulations, reducing the risk of costly penalties.',
  },
];

export const testimonials = [
  {
    title: 'An Attorney Who Cares!!!',
    body: 'Tim has been extremely helpful to me over the last couple of years with my roth IRA issues. I was very nervous and scared about the predicament that I was in, but having him in my corner has helped me feel so much more confident and secure. I feel that I can trust him, and that I can rely on his expertise. I think he really cares and has a big heart, and is a great attorney. I highly recommend his council, and his experience to everyone. Thank you Tim for all your help! I really appreciate it!!',
    name: 'Anonymous',
  },
  {
    title: 'Tim really helped me out of a problem',
    body: 'So I received a 1099 that should have been issued to my LLC. This was going to be expensive if I couldn’t get it resolved. I talked to several people in the tax and financial fields and got numerous answers and suggestions none of which made much sense. Tim Berry called me back in few minutes told me just how to handle my problem. His willingness to give me a few minutes of his time and his knowledge got me through a stressful situation. Thanks again Tim',
    name: 'Jack',
  },
  {
    title: 'Purchasing Property With an IRA',
    body: 'My wife and I were referred to Timothy Berry regarding a piece of property we were thinking about purchasing with an IRA, He explained the different ways we could purchase the properties that would give us the best tax advantages. I found Timothy to very knowledgeable, and his information informative. Timothy did not charge us for this consultation which surprised me and he offered to help us in the future if needed. It was refreshing to speak to a lawyer with our best interest in mind. I would recommend Timothy to anyone who is in need of a lawyer in his field.',
    name: 'Charles',
  },
  {
    title: 'Expert Self Directed IRA’s',
    body: 'Tim helped me out with an error my tax accountant found while doing my 2018 taxes for my self directed IRA. I called Tim and explained the situation. He immediately gave me 3 different options of what I could do to resolve my issue for the 2018 tax year. He prioritized each of the 3 and explained the risks. He is a great resource and I’ll be utilizing his services again.',
    name: 'Anonymous',
  },
  {
    title: 'Very Effective!',
    body: 'Tim Berry is thorough, accessible and most importantly, EFFECTIVE. I mistakenly moved IRA money in a way that made it taxable instead of a roll-over and Tim was able to penetrate the bureaucratic wall at the IRS via a clear presentation of the facts and appropriate citations. The initial IRS ruling was reversed. I highly recommend him!',
    name: 'Anonymous',
  },
];

export const videos = [
  { id: '8iQx2EfWfK0', title: 'How to Change 401K Providers?' },
  { id: 'F9vTCIlAMcQ', title: 'How to move alternative assets into 401K?' },
  { id: '4Io2TRi1n4o', title: 'The Danger of IRA rollovers' },
  { id: 'd2nsOskj56w', title: 'Trading stocks in a self directed 401k account' },
  { id: '066PD4k_g14', title: 'Can I purchase a business with my self directed IRA?' },
  { id: 'Fx-OxEgYSgs', title: 'How to Value your 401k Assets' },
  { id: 'qa9WefOlaZM', title: 'Real Estate in your IRA? Watch this before investing' },
  { id: 'uwHxLxobxZY', title: 'What is the value of your 401K' },
  { id: 'yq6WkXRjUJ4', title: 'Self Directed IRAs and loaning money' },
  { id: 'rYaD1Zgh4hs', title: 'Real Estate in your 401k? Don’t use a 5500SF' },
  { id: 'YHmwdhdSzwM', title: 'Tips for investing IRA in LLC' },
  { id: 'wapXbpigYXA', title: 'Does your IRA need an EIN?' },
  { id: 'sv5SBE5nMoA', title: 'Does your IRA need to file a tax return?' },
  { id: 'w49ix_HS2ig', title: 'Can your IRA Invest in S corporation?' },
  { id: 'lztMIUBIeWM', title: 'Can an IRA borrow money?' },
  { id: 'uuHvDOMYF4k', title: 'Can I flip Real Estate in my IRA?' },
  { id: 'kmSPMj8XQ_A', title: 'UBIT in IRA’s' },
  { id: 'h3Hg26Lv8FQ', title: 'IRA LLC Successor Managers in Operating Agreements' },
  { id: 'HFF81ndp4KI', title: 'Tax Court invalidates IRA LLCs?' },
  { id: 'TN4FV6QX38o', title: 'Wipe out taxes on your kid’s college tuition' },
];
