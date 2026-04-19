window.KW_DATA = {
  name: "Ke Wang",
  cn: "王 可",
  email: "kewang0622@gmail.com",
  site: "kewang0622.github.io",
  scholar: "https://scholar.google.com/citations?user=Iz3m3v4AAAAJ",

  // From Google Scholar (as of 2026)
  metrics: {
    citations: 425,
    h_index: 10,
    i10_index: 10,
    // citations per year from Scholar
    byYear: [
      ["2019", 1],
      ["2020", 4],
      ["2021", 21],
      ["2022", 60],
      ["2023", 91],
      ["2024", 89],
      ["2025", 107],
      ["2026", 24],
    ],
  },

  // Ordered by citation count — matches Scholar
  publications: [
    { year:"2022", venue:"PNAS",    cites:127, title:"Implicit data crimes: Machine learning bias arising from misuse of public data",
      authors:"E Shimron, JI Tamir, K Wang, M Lustig",
      role:"co-author", url:"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9060447/",
      tldr:"Off-label use of open MRI datasets inflates reported error reductions by 25–48%. Names a real bias now inherited by modern solvers."
    },
    { year:"2021", venue:"MRM",     cites:61,  title:"CG-SENSE revisited: Results from the first ISMRM reproducibility challenge",
      authors:"O Maier, …, K Wang, … (multi-author)",
      role:"co-author", url:"https://onlinelibrary.wiley.com/doi/10.1002/mrm.28569",
      tldr:"First MRI reproducibility challenge; CG-SENSE re-implemented across labs."
    },
    { year:"2023", venue:"CVPR",    cites:47,  title:"Semi-Supervised Parametric Real-World Image Harmonization",
      authors:"K Wang, M Gharbi, H Zhang, Z Xia, E Shechtman",
      role:"first author", url:"https://openaccess.thecvf.com/content/CVPR2023/papers/Wang_Semi-Supervised_Parametric_Real-World_Image_Harmonization_CVPR_2023_paper.pdf",
      tldr:"Parametric harmonizer (RGB curves + shading map) trained on unpaired real composites. Runs on hi-res interactively."
    },
    { year:"2020", venue:"IEEE SPM",cites:36,  title:"Computational MRI with physics-based constraints",
      authors:"JI Tamir, F Ong, S Anand, E Karasan, K Wang, M Lustig",
      role:"co-author", url:"https://ieeexplore.ieee.org/document/8962391",
      tldr:"Review of physics-constrained computational MRI for multi-contrast & quantitative imaging."
    },
    { year:"2022", venue:"MRM",     cites:33,  title:"UFLoss: Instance-wise discriminative feature matching for MRI reconstruction",
      authors:"K Wang, JI Tamir, A De Goyeneche, U Wollner, R Brada, SX Yu, M Lustig",
      role:"first author", url:"https://onlinelibrary.wiley.com/doi/abs/10.1002/mrm.29227",
      tldr:"Unsupervised patch-based feature loss → sharper edges and more faithful textures vs ℓ₂."
    },
    { year:"2023", venue:"MRM",     cites:25,  title:"High-fidelity Direct Contrast Synthesis from MR Fingerprinting",
      authors:"K Wang, M Doneva, J Meineke, T Amthor, E Karasan, F Tan, JI Tamir, SX Yu, M Lustig",
      role:"first author", url:"https://onlinelibrary.wiley.com/doi/10.1002/mrm.29766",
      tldr:"Conditional GAN w/ multi-branch U-Net synthesizes T1/T2/FLAIR directly from MRF, skipping Bloch simulation."
    },
    { year:"2020", venue:"ISMRM",   cites:20,  title:"Direct Contrast Synthesis from MRF in diagnostic imaging (abstract)",
      authors:"K Wang, M Doneva, T Amthor, VC Keil, E Karasan, F Tan, …",
      role:"first author", url:"https://archive.ismrm.org/2020/0867.html",
      tldr:"Early proof of direct MRF→contrast synthesis; seed of the MRM 2023 paper."
    },
    { year:"2021", venue:"MICCAI",  cites:19,  title:"Memory-Efficient Learning for High-Dimensional MRI Reconstruction",
      authors:"K Wang, M Kellman, CM Sandino, K Zhang, SS Vasanawala, JI Tamir, M Lustig",
      role:"first author", url:"https://link.springer.com/chapter/10.1007/978-3-030-87231-1_45",
      tldr:"Trades storage for a manageable compute bump — lets deeper nets train on 3D & 2D+t MRI."
    },
    { year:"2023", venue:"NeurIPS", cites:14,  title:"ResoNet: Noise-trained physics-informed MRI off-resonance correction",
      authors:"A De Goyeneche, S Ramachandran, K Wang, E Karasan, …",
      role:"co-author", url:"https://openreview.net/forum?id=Ia4dmqst0Z",
      tldr:"Off-resonance corrector trained only on synthetic noise; reverses blur across anatomies w/ no retraining."
    },
    { year:"2022", venue:"ISMRM",   cites:5,   title:"Rigorous Uncertainty Estimation for MRI Reconstruction",
      authors:"K Wang, A Angelopoulos, A De Goyeneche, A Kohli, E Shimron, S Yu, M Lustig",
      role:"first author", url:"https://archive.ismrm.org/2022/0749.html",
      tldr:"Per-pixel confidence intervals with a 95% coverage guarantee; a probe for DL hallucination in MRI."
    },
    { year:"2022", venue:"ISMRM",   cites:5,   title:"BladeNet: Rapid PROPELLER Acquisition + Reconstruction",
      authors:"E Shimron, A De Goyeneche, K Wang, A Halgren, AB Syed, …",
      role:"co-author", url:"https://archive.ismrm.org/2022/0684.html",
      tldr:"High spatio-temporal resolution abdominal MRI via learned PROPELLER reconstruction."
    },
    { year:"2021", venue:"arXiv",   cites:3,   title:"OUTCOMES: Rapid under-sampling optimization for multi-contrast MRI",
      authors:"K Wang, E Gong, Y Zhang, S Banerjee, G Zaharchuk, J Pauly",
      role:"first author", url:"https://arxiv.org/abs/2103.04566",
      tldr:"Optimizes sampling patterns — up to 50% better reconstruction for multi-contrast sequences."
    },
    { year:"2024", venue:"ICME",    cites:2,   title:"I-Matting: Improved trimap-free image matting",
      authors:"Z Liu, K Wang, M Wu, L Yu, K Nahrstedt, X Lu",
      role:"co-author", url:"https://ieeexplore.ieee.org/document/10687801",
      tldr:"Trimap-free matting improvements."
    },
    { year:"2025", venue:"arXiv",   cites:1,   title:"PhotoFramer: Multi-modal Image Composition Instruction",
      authors:"Z You, K Wang, H Zhang, X Cai, J Gu, T Xue, C Dong, Z Zhang",
      role:"co-author", url:"https://arxiv.org/abs/2512.00993",
      tldr:"Given a poorly composed image, PhotoFramer describes how to fix it in natural language, then shows an example frame."
    },
    { year:"2023", venue:"Thesis",  cites:0,   title:"Magnetic Resonance Image Reconstruction with Greater Fidelity and Efficiency",
      authors:"K Wang",
      role:"PhD dissertation (Berkeley EECS)", url:"https://www2.eecs.berkeley.edu/Pubs/TechRpts/2023/EECS-2023-178.html",
      tldr:"PhD thesis — greatest hits from 2018–2023 on high-fidelity, memory-efficient, uncertainty-aware MRI reconstruction."
    },
    { year:"2019", venue:"EMBC",    cites:1,   title:"Non-Invasive Remote Temperature Monitoring via Microwave-Induced Thermoacoustic Imaging",
      authors:"H Nan, A Fitzpatrick, K Wang, A Arbabian",
      role:"co-author", url:"https://pubmed.ncbi.nlm.nih.gov/31947301/",
      tldr:"Combines microwave contrast w/ ultrasound resolution; degree-level accuracy at depth."
    },
  ],

  // Full CV timeline
  timeline: [
    ["2025 — now", "Applied Research Lead", "Pika Labs · San Francisco",
      "Leading applied research for a team building the next generation of generative video models."],
    ["2024 — 2025", "Computer Scientist", "Adobe · Computational Photography (Marc Levoy's team)",
      "Tech lead of the burst super-resolution technology behind Project Indigo — a software-defined iPhone camera app. Launched June 2025; covered by The Verge, Engadget, DPReview, PetaPixel."],
    ["2023 — 2024", "Senior Research Engineer", "Samsung Research America · MPI Lab",
      "Real-world computational imaging and computer vision."],
    ["2018 — 2023", "PhD, EECS", "UC Berkeley · BAIR",
      "Thesis: MRI Reconstruction with Greater Fidelity and Efficiency. Advisors: Miki Lustig & Stella Yu."],
    ["Summers 2019 — 2022", "Research intern / collaborator", "Stanford · GE Healthcare · Philips Research",
      "Projects spanning MRI fingerprinting, off-resonance correction, and accelerated acquisition."],
    ["2014 — 2018", "BEng, Biomedical Engineering (honors)", "Tsinghua University (清华大学)",
      "First exposure to inverse problems and medical imaging."],
  ],

  news: [
    ["Nov 2025", "PhotoFramer preprint on arXiv — a multimodal composition instructor.", "https://arxiv.org/abs/2512.00993"],
    ["Sep 2025", "Joined Pika Labs as Applied Research Lead.", "https://pika.art/"],
    ["Jun 2025", "Project Indigo shipped — featured in The Verge, Engadget, DPReview, PetaPixel.", "https://research.adobe.com/articles/indigo/indigo.html"],
    ["Jan 2024", "Joined Adobe with Marc Levoy's computational photography team.", null],
    ["Sep 2023", "ResoNet accepted at NeurIPS 2023.", "https://openreview.net/forum?id=Ia4dmqst0Z"],
    ["Jun 2023", "Semi-supervised Parametric Real-world Image Harmonization at CVPR.", "https://kewang0622.github.io/sprih/"],
    ["May 2023", "PhD conferred — UC Berkeley EECS. Go Bears 🐻", "https://www2.eecs.berkeley.edu/Pubs/TechRpts/2023/EECS-2023-178.html"],
    ["Apr 2022", "UFLoss published in MRM.", "https://onlinelibrary.wiley.com/doi/abs/10.1002/mrm.29227"],
    ["Feb 2022", "Implicit Data Crimes published in PNAS.", "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9060447/"],
  ],

  press: [
    ["The Verge",   "Adobe's Project Indigo is a new camera app from former Pixel engineers", "https://www.theverge.com/news/690115/adobe-project-indigo-camera-app-marc-levoy"],
    ["Engadget",    "Project Indigo is a new photo app from former Pixel camera engineers",   "https://www.engadget.com/apps/adobe-project-indigo-is-a-new-photo-app-from-former-pixel-camera-engineers-213453207.html"],
    ["PetaPixel",   "Adobe's new computational iPhone camera app looks incredible",            "https://petapixel.com/2025/06/19/adobes-new-computational-iphone-camera-app-looks-incredible/"],
    ["DPReview",    "Adobe quietly made a super-powered camera app for iPhone",                "https://www.dpreview.com/news/4142720910/adobe-quietly-made-a-super-powered-camera-app-for-iphone"],
    ["Adobe Research","Project Indigo — research article",                                      "https://research.adobe.com/articles/indigo/indigo.html"],
    ["App Store",   "Project Indigo on the App Store",                                          "https://apps.apple.com/us/app/project-indigo/id6742591546"],
  ],

  collaborators: [
    { name:"Michael (Miki) Lustig", affil:"UC Berkeley EECS",           role:"PhD co-advisor",      url:"http://people.eecs.berkeley.edu/~mlustig/" },
    { name:"Stella X. Yu",          affil:"University of Michigan",     role:"PhD co-advisor",      url:"https://web.eecs.umich.edu/~stellayu/" },
    { name:"Marc Levoy",            affil:"Adobe",                      role:"Indigo team lead",    url:"https://graphics.stanford.edu/~levoy/" },
    { name:"Jonathan I. Tamir",     affil:"UT Austin",                  role:"close collaborator",  url:"https://users.ece.utexas.edu/~jtamir/" },
    { name:"Michaël Gharbi",        affil:"Adobe Research",             role:"CVPR '23 co-author",  url:"https://mgharbi.com/" },
    { name:"Eli Shechtman",         affil:"Adobe Research",             role:"CVPR '23 co-author",  url:"https://research.adobe.com/person/eli-shechtman/" },
    { name:"Efrat Shimron",         affil:"Technion",                   role:"PNAS '22 co-author",  url:"https://www.efratshimron.com/" },
    { name:"Alfredo De Goyeneche",  affil:"UC Berkeley",                role:"NeurIPS '23",         url:"https://people.eecs.berkeley.edu/~asdegoyeneche/" },
    { name:"Shreya Ramachandran",   affil:"UC Berkeley",                role:"NeurIPS '23",         url:"https://scholar.google.com/citations?user=8mnnKqsAAAAJ" },
    { name:"Ekin Karasan",          affil:"UC Berkeley",                role:"multiple papers",     url:"https://scholar.google.com/citations?user=6Rasfn4AAAAJ" },
    { name:"Mariya Doneva",         affil:"Philips Research",           role:"MRF collaborator",    url:"https://www.linkedin.com/in/mariya-doneva/" },
    { name:"Frank Ong",             affil:"frankong.com",               role:"MRI collaborator",    url:"https://frankong.com/" },
    { name:"Shreyas Vasanawala",    affil:"Stanford Radiology",         role:"MRI collaborator",    url:"https://profiles.stanford.edu/shreyas-vasanawala" },
    { name:"Christopher Sandino",   affil:"Apple",                      role:"MICCAI co-author",    url:"https://scholar.google.com/citations?user=of5XwBQAAAAJ" },
    { name:"Kerstin Hammernik",     affil:"NVIDIA",                     role:"CG-SENSE challenge",  url:"https://scholar.google.com/citations?user=IIqyUmAAAAAJ" },
  ],

  services: [
    { year:"2023 →", venues:["NeurIPS","ICLR","SIGGRAPH","SIGGRAPH Asia","MICCAI"], role:"Reviewer" },
    { year:"2022",   venues:["ISMRM"],                                               role:"Oral presenter" },
    { year:"2021",   venues:["MICCAI"],                                              role:"Oral presenter" },
  ],

  skills: [
    "Computational imaging",
    "Generative video & diffusion models",
    "Deep learning for inverse problems",
    "Computational photography",
    "MRI reconstruction",
    "Shipping research into products",
    "PyTorch · JAX · CUDA",
    "iOS camera pipeline",
  ],
};
