/* Shared facts for both portfolio adventures. Updated from Ke on 2026-10-23. */
window.KE_WORLD = {
  updated: '2026-10-23',
  title: 'Ke’s Pokémon World',
  profile: {
    name: 'Ke Wang',
    chineseName: '王可',
    role: 'Senior Applied Scientist',
    team: 'Adobe Foundation Model team',
    since: 'September 2026',
    focus: 'Reinforcement learning and post-training for multimodal foundation models',
    workEmail: 'kewang@adobe.com',
    workEmailDisplay: 'kewang [at] adobe [dot] com',
    personalEmailDisplay: 'kewang0622 [at] gmail [dot] com',
    portrait: '/assets/img/kw_ws.jpg',
    homepage: '/',
    cv: '/cv/',
    github: 'https://github.com/KeWang0622',
    scholar: 'https://scholar.google.com/citations?user=Iz3m3v4AAAAJ&hl=en'
  },
  places: [
    {
      id: 'tsinghua', title: 'Tsinghua Garden', kicker: 'Where the adventure began', x: -10, z: 6,
      summary: 'Biomedical engineering, with honors.',
      body: 'I studied biomedical engineering at Tsinghua University. My curiosity about medicine, engineering, and imaging started here—and still shapes the questions I work on today.',
      badge: 'Curiosity', color: '#8566aa',
      links: [{label: 'Read my background', url: '/cv/'}]
    },
    {
      id: 'berkeley', title: 'Berkeley Tower', kicker: 'Ph.D. · EECS · 2018–2023', x: -9, z: -5,
      summary: 'Learning to see beyond the measurements.',
      body: 'At UC Berkeley, I worked with Miki Lustig and Stella Yu and was a member of BAIR. My Ph.D. explored MRI reconstruction with greater fidelity and efficiency: perceptual losses, contrast synthesis, memory-efficient learning, and uncertainty.',
      badge: 'Discovery', color: '#587fac',
      links: [{label: 'Read my Ph.D. thesis', url: 'https://www2.eecs.berkeley.edu/Pubs/TechRpts/2023/EECS-2023-178.html'}, {label: 'Research papers', url: '/publications/'}]
    },
    {
      id: 'imaging', title: 'Imaging Observatory', kicker: 'Photography · Vision · MRI', x: 0, z: -8,
      summary: 'From invisible signals to images that matter.',
      body: 'I worked at Samsung Research America’s MPI Lab, then on Marc Levoy’s computational photography team at Adobe. I developed burst super-resolution for Project Indigo. My research also spans image harmonization, photo composition, MRI reconstruction, and quantitative imaging.',
      badge: 'Vision', color: '#df9f50',
      links: [{label: 'Project Indigo', url: 'https://research.adobe.com/articles/indigo/indigo.html'}, {label: 'PhotoFramer · CVPR 2026', url: 'https://zhiyuanyou.github.io/photoframer/'}, {label: 'All publications', url: '/publications/'}]
    },
    {
      id: 'pika', title: 'Pika Studio', kicker: 'Previously · Head of Applied Research', x: 9, z: -5,
      summary: 'Research that becomes something people can use.',
      body: 'Previously, I was Head of Applied Research at Pika Labs, where I co-led the agent research behind Pika.me. This chapter brought together generative AI, applied research, and building experiences for people.',
      badge: 'Creation', color: '#cc829b',
      links: [{label: 'Explore Pika.me', url: 'https://pika.me/'}, {label: 'Pika Labs', url: 'https://pika.art/'}]
    },
    {
      id: 'adobe', title: 'Adobe Research', kicker: 'Now · September 2026–present', x: 10, z: 6,
      summary: 'Reinforcement learning. Post-training. Multimodal AI.',
      body: 'I’m a Senior Applied Scientist on Adobe’s Foundation Model team. I work on reinforcement learning and post-training for multimodal foundation models, drawing on my background in computational imaging, computer vision, and MRI.',
      badge: 'Next chapter', color: '#df7769',
      links: [{label: 'My current CV', url: '/cv/'}, {label: 'Research publications', url: '/publications/'}]
    },
    {
      id: 'mrfoundry', title: 'MRFoundry Workshop', kicker: 'Open source · Tools for discovery', x: -1, z: 5,
      summary: 'Give a coding agent the MRI knowledge it needs.',
      body: 'MRFoundry connects a research question to MRI skills, established tools, and evidence a researcher can inspect. Explore the tutorial, see the workflows, or contribute. My other projects include Kaogong, Pantheon, and Nobodybuilt.',
      badge: 'Builder', color: '#5b9f9b',
      links: [{label: 'MRFoundry on GitHub', url: 'https://github.com/KeWang0622/MRFoundry'}, {label: 'Interactive tutorial', url: '/slides/mrfoundry/'}, {label: 'Workflow examples', url: '/mrfoundry/examples/'}, {label: 'Kaogong', url: 'https://github.com/KeWang0622/kaogong-skill'}, {label: 'All my repositories', url: 'https://github.com/KeWang0622?tab=repositories'}]
    },
    {
      id: 'internships', title: 'Summer 2027 Camp', kicker: 'An invitation to join the adventure', x: 0, z: 11,
      summary: 'Interested in doing research together?',
      body: 'I’m actively looking to host research interns at Adobe for summer 2027, working on reinforcement learning and post-training for multimodal foundation models. Feel free to reach out: kewang [at] adobe [dot] com.',
      badge: 'Let’s connect', color: '#75a16a',
      links: [{label: 'Email Ke about summer 2027', url: 'mailto:kewang@adobe.com?subject=Summer%202027%20Research%20Internship'}, {label: 'View my research', url: '/publications/'}]
    }
  ]
};
