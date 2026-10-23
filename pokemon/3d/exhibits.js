/*
 * Public exhibits for the seven rooms in Ke's research village.
 * Sources: _pages/about.md, _data/cv.yml, _bibliography/papers.bib,
 * sprih/index.html, and mrfoundry/examples/composition/evidence/fun-mri/README.md.
 * Product imagery: official Adobe Research and Pika pages, with original URLs
 * and attribution recorded in assets/exhibits/SOURCES.md.
 * Figures keep their original aspect ratio and must be displayed with contain.
 */
const portrait = '/assets/img/kw_ws.jpg';
const earlyPortrait = '/assets/img/ke_photo.jpg';
const papers = '/assets/img/publication_preview/';
const products = '/pokemon/3d/assets/exhibits/';
const indigoSource = 'https://research.adobe.com/articles/indigo/indigo.html';
const pikaSource = 'https://experiment.pika.art/ai-self';

export const EXHIBITS = {
  tsinghua: [
    {
      id: 'biomedical-beginnings',
      title: 'Where medicine met engineering',
      description: 'Ke studied biomedical engineering at Tsinghua University, graduating with honors in 2018. His undergraduate research explored magnetic resonance temperature imaging.',
      image: earlyPortrait,
      alt: 'An earlier public portrait of Ke Wang, wearing a red checked shirt outdoors.',
      href: '/cv/',
      label: 'Explore the education timeline',
      kind: 'Portrait · Education',
      credit: 'Ke Wang · public profile photograph'
    }
  ],
  berkeley: [
    {
      id: 'berkeley-thesis',
      title: 'Fidelity and efficiency',
      description: 'Ke’s Berkeley Ph.D. brought together MRI reconstruction, perceptual learning, contrast synthesis and computational efficiency, advised by Miki Lustig and Stella Yu.',
      image: papers + 'thesis.jpg',
      alt: 'MRI reconstruction diagram showing fully sampled and undersampled k-space, reconstructed knee images, and a learning objective.',
      href: 'https://www2.eecs.berkeley.edu/Pubs/TechRpts/2023/EECS-2023-178.html',
      label: 'Read the 2023 dissertation',
      kind: 'Ph.D. thesis · 2023',
      credit: 'Ke Wang · Berkeley dissertation, 2023'
    },
    {
      id: 'ufloss',
      title: 'Learning what an image should preserve',
      description: 'UFLoss learns discriminative image features for a perceptual loss in MRI reconstruction. The figure connects feature learning to the reconstruction model.',
      image: papers + 'ufloss.jpg',
      alt: 'UFLoss figure: knee image patches train a feature mapping network, then its learned features guide reconstruction.',
      href: 'https://onlinelibrary.wiley.com/doi/abs/10.1002/mrm.29227',
      label: 'Read the MRM paper',
      kind: 'MRI reconstruction · MRM 2022',
      credit: 'Wang et al. · UFLoss, MRM 2022'
    },
    {
      id: 'memory-efficient-mri',
      title: 'Making room for higher-dimensional MRI',
      description: 'Memory-efficient learning makes high-dimensional reconstruction models more practical. This work studies 3D imaging and cardiac cine reconstruction.',
      image: papers + 'miccai.jpg',
      alt: 'Paper figure comparing 2D and 3D MRI learning, and the GPU memory demands of unrolled cardiac reconstruction.',
      href: 'https://github.com/mikgroup/MEL_MRI',
      label: 'Explore the research code',
      kind: 'Memory-efficient learning · MICCAI 2021',
      credit: 'Wang et al. · MICCAI 2021'
    }
  ],
  imaging: [
    {
      id: 'harmonization-result',
      title: 'Make a composite feel like one photograph',
      description: 'Semi-supervised parametric image harmonization adjusts global color and local shading. This dog-and-waterfall composite is a result from Ke’s CVPR 2023 project.',
      image: papers + 'after.jpeg',
      alt: 'An image harmonization result: a dog in a cave looks toward a waterfall and a pink sunset.',
      href: '/sprih/',
      label: 'Explore the project and comparisons',
      kind: 'Image harmonization · CVPR 2023',
      credit: 'Wang et al. · CVPR 2023'
    },
    {
      id: 'mrf-contrast',
      title: 'One acquisition, several contrasts',
      description: 'Direct contrast synthesis learns to produce T1-weighted, T2-weighted and FLAIR images from magnetic resonance fingerprinting data.',
      image: papers + 'mrf.jpg',
      alt: 'MRI fingerprinting paper diagram comparing parameter-map synthesis with direct generation of T1, T2 and FLAIR contrasts.',
      href: 'https://onlinelibrary.wiley.com/doi/abs/10.1002/mrm.29766',
      label: 'Read the contrast-synthesis paper',
      kind: 'Quantitative MRI · MRM 2023',
      credit: 'Wang et al. · MRM 2023'
    }
  ],
  pika: [
    {
      id: 'pika-agents',
      title: 'From research to personal agents',
      description: 'Previously Head of Applied Research at Pika, Ke co-led the agent research behind Pika.me: personal agents with a voice, face and personality.',
      image: products + 'pika-agents.jpg',
      alt: 'Official Pika Agents artwork: a person and a stylized digital character facing each other against a starry background.',
      href: 'https://pika.me/',
      label: 'Visit Pika.me',
      kind: 'Previous role · Pika',
      credit: 'Pika · official Pika Agents artwork',
      source: pikaSource,
      imageSource: 'https://experiment.pika.art/opengraph2.png'
    },
    {
      id: 'pika-video-conversation',
      title: 'A conversation beyond text',
      description: 'The Pika Agents product demo brings a digital character into a live video conversation. This is the official “AI Alex” demonstration artwork.',
      image: products + 'pika-video-call.webp',
      alt: 'AI Alex, a stylized Pika digital character with dark hair, waving hello in the official video-call demonstration.',
      href: 'https://pika.me/',
      label: 'Explore Pika Agents',
      kind: 'Product demo · Voice and video',
      credit: 'Pika · AI Alex demo artwork',
      source: pikaSource,
      imageSource: 'https://experiment.pika.art/images/landing/47_call_default.webp'
    }
  ],
  adobe: [
    {
      id: 'adobe-now',
      title: 'What I’m working on now',
      description: 'Senior Applied Scientist on the Adobe Foundation Model team since September 2026. Ke works on reinforcement learning and post-training for multimodal foundation models.',
      image: portrait,
      alt: 'Ke Wang wearing a blue sweater, photographed outdoors beneath a blue sky.',
      href: '/cv/',
      label: 'Read the current CV',
      kind: 'Current role · Adobe',
      credit: 'Ke Wang · public profile photograph'
    },
    {
      id: 'adobe-indigo-camera',
      title: 'Project Indigo: software-defined photography',
      description: 'Earlier at Adobe, Ke worked on burst super-resolution for Project Indigo. Here is the camera app’s interface, as featured in Adobe’s launch article.',
      image: products + 'indigo-camera.jpg',
      alt: 'Official Project Indigo camera interface on an iPhone, framing the Golden Gate Bridge with manual camera controls.',
      href: indigoSource,
      label: 'Read the Project Indigo story',
      kind: 'Earlier work · Computational photography',
      credit: 'Adobe Research · Project Indigo interface',
      source: indigoSource,
      imageSource: 'https://research.adobe.com/articles/indigo/phone-mockup2-shadow2.jpg'
    },
    {
      id: 'adobe-indigo-super-resolution',
      title: 'More detail from a burst of frames',
      description: 'Indigo combines multiple captured frames for super-resolution. Adobe’s 10× zoom example shows the San Francisco skyline with an enlarged detail.',
      image: products + 'indigo-super-resolution.jpg',
      alt: 'Adobe’s Indigo super-resolution example: San Francisco skyline at 10× zoom, with a magnified crop of the buildings.',
      href: indigoSource,
      label: 'Explore the super-resolution example',
      kind: 'Product example · Project Indigo',
      credit: 'Adobe Research · official Indigo example',
      source: indigoSource,
      imageSource: 'https://research.adobe.com/articles/indigo/san-francisco-10x-with-inset-bonsai-5.png'
    }
  ],
  mrfoundry: [
    {
      id: 'meet-mrfoundry',
      title: 'MRI expertise for an agent’s workbench',
      description: 'MRFoundry connects a research request to MRI guidance, established software and inspectable evidence. Its friendly scanner mascot accompanies the open-source project.',
      image: '/assets/img/mri-mascot.png',
      alt: 'MRFoundry’s smiling ivory-and-blue MRI scanner mascot.',
      href: 'https://github.com/KeWang0622/MRFoundry',
      label: 'Explore MRFoundry on GitHub',
      kind: 'Open source · MRFoundry',
      credit: 'MRFoundry · project mascot'
    },
    {
      id: 'mrfoundry-tutorial',
      title: 'Follow a research request from start to finish',
      description: 'The interactive tutorial follows how an agent combines skills, calls tools, reviews outputs and records lessons for the next task.',
      image: '/assets/img/mrfoundry-wordmark-light.svg',
      alt: 'The MRFoundry wordmark, with blue MR lettering and a dark serif Foundry.',
      href: '/slides/mrfoundry/',
      label: 'Open the interactive tutorial',
      kind: 'Interactive tutorial',
      credit: 'MRFoundry · project wordmark'
    },
    {
      id: 'mrfoundry-sequence-demo',
      title: 'Write “MRI” into k-space',
      description: 'A playful example designs letter-shaped sampling with PyPulseq and reconstructs synthetic data with SigPy. Shown: the reference phantom. The demo includes timing checks and reconstruction evidence.',
      image: '/mrfoundry/examples/composition/assets/fun-reference.png',
      alt: 'The synthetic Shepp–Logan reference phantom used by MRFoundry’s letter-shaped k-space example.',
      href: '/mrfoundry/examples/',
      label: 'Inspect the runnable examples',
      kind: 'Simulation demonstration',
      credit: 'MRFoundry · synthetic Shepp–Logan reference phantom'
    }
  ],
  internships: [
    {
      id: 'summer-2027',
      title: 'Let’s build the next chapter',
      description: 'Ke is actively looking to host Summer 2027 research interns at Adobe, focused on reinforcement learning and post-training for multimodal foundation models. Reach out at kewang [at] adobe [dot] com.',
      image: portrait,
      alt: 'Ke Wang, the prospective host for Summer 2027 research internships.',
      href: 'mailto:kewang@adobe.com?subject=Summer%202027%20Research%20Internship',
      label: 'Get in touch about Summer 2027',
      kind: 'Research internships · Summer 2027',
      credit: 'Ke Wang · public profile photograph'
    },
    {
      id: 'internship-to-paper',
      title: 'An internship can become a research story',
      description: 'During an earlier Adobe Research internship, Ke developed a real-world parametric harmonization pipeline. That work became the CVPR 2023 project shown here.',
      image: papers + 'after.jpeg',
      alt: 'Published harmonization result showing a dog integrated into a waterfall scene.',
      href: '/sprih/',
      label: 'Explore that earlier project',
      kind: 'Past research internship · CVPR 2023',
      credit: 'Wang et al. · CVPR 2023'
    }
  ]
};

export default EXHIBITS;
