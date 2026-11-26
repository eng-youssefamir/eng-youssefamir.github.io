/* defaults.js: starter content for sections that are new. Shown until you save your own from /admin.html. */
window.SITE_DEFAULTS = {
  services: [
    {
      title: 'Platform and infrastructure roles',
      lang: 'en',
      summary: 'Open to entry-level and trainee roles in platform engineering, infrastructure, DevOps, and IT operations. Remote work with international teams is the goal.',
      points: ['Linux administration and networking fundamentals', 'Python scripting for small automation tasks', 'Clear written documentation for everything I build'],
      note: 'I am early on the path and I say so. Every step of my progress is public on the Work and Log pages.',
      ctaLabel: 'Discuss a role'
    },
    {
      title: 'كتابة الكتب بالنيابة',
      lang: 'ar',
      summary: 'أحوّل فكرتك وخبرتك إلى كتاب مكتوب بصوتك، من التخطيط والهيكلة حتى المسودة النهائية.',
      points: ['تخطيط الكتاب وهيكلة الفصول', 'كتابة المسودات بأسلوبك وصوتك', 'مراجعة وتحرير حتى النسخة النهائية', 'سرية كاملة للعمل وللعميل'],
      note: 'السعر يعتمد على حجم الكتاب وتفاصيله. راسلني بفكرتك أولاً.',
      ctaLabel: 'اسأل عن هذه الخدمة'
    },
    {
      title: 'كتابة المحتوى والمقالات',
      lang: 'ar',
      summary: 'نصوص واضحة تصل إلى قارئها، للمواقع والمدونات والحملات.',
      points: ['مقالات ومحتوى للمدونات والمواقع', 'نصوص تسويقية وإعلانية', 'ملخصات كتب وسكربتات فيديو'],
      note: 'أخبرني عن جمهورك وهدفك وسأقترح عليك الشكل المناسب.',
      ctaLabel: 'اسأل عن هذه الخدمة'
    },
    {
      title: 'البحث وكتابة المقالات',
      lang: 'ar',
      summary: 'مقالات وأبحاث مبسّطة تربط الفكرة بمصادرها وأدلتها بلغة سهلة.',
      points: ['جمع المصادر وتلخيصها', 'كتابة مقالات بحثية واضحة', 'تنسيق المراجع والاقتباسات'],
      note: 'يُحدَّد النطاق والموعد بعد أن تشرح لي حاجتك.',
      ctaLabel: 'اسأل عن هذه الخدمة'
    }
  ],
  community: {
    status: 'soon',
    lead: 'A private space for readers and builders: members-only articles and videos, guided learning, and a group where you can ask questions and get answers.',
    perks: [
      { title: 'Members-only writing', text: 'Articles and book breakdowns that go deeper than the public blog.' },
      { title: 'Exclusive videos', text: 'Breakdowns and walkthroughs that are not published anywhere else.' },
      { title: 'Courses and guided paths', text: 'Step-by-step learning, from platform engineering basics to clearer thinking and writing.' },
      { title: 'A private group', text: 'Ask questions, share what you are building, and get feedback.' },
      { title: 'First to know', text: 'Members get an email as soon as something new is published.' }
    ],
    plans: [
      {
        name: 'Member',
        blurb: 'Full access to the community and everything published for members.',
        currency: 'USD', priceMonth: '', priceYear: '', urlMonth: '', urlYear: '', featured: 'yes',
        perks: ['Private group access', 'Members-only articles and videos', 'Courses and guided paths', 'Email when something new is published']
      }
    ],
    support: [
      { title: 'Support the work', text: 'Not ready to subscribe? You can support the writing and the videos with a one-time contribution. No account needed.', label: 'Support', url: '' }
    ],
    faq: [
      { q: 'When does the community open?', a: 'Join the waitlist and you will get one email when the doors open.' },
      { q: 'Do I need an account on this website?', a: 'No. The website stays open to everyone. Members get a separate account for the community space only.' },
      { q: 'How does billing work?', a: 'You choose monthly or yearly. Prices are announced when the community opens.' },
      { q: 'How will I know when something new is published?', a: 'Members get an email when new members-only content goes up.' }
    ]
  }
};
