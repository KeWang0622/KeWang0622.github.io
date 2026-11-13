---
layout: about
title: about
permalink: /
subtitle: # <a href='#'>Affiliations</a>. Address. Contacts. Moto. Etc.

portfolio_entrances: true

profile:
  align: left
  image: kw_ws.jpg
  image_circular: false # crops the image to make it circular
  # address: 

news: true  # includes a list of news items
latest_posts: false  # includes a list of the newest posts
selected_papers: true # includes a list of papers marked as "selected={true}"
social: true  # includes social icons at the bottom of the page
---


I am a **Senior Applied Scientist** on the **Adobe Foundation Model team**, working on **reinforcement learning and post-training for multimodal foundation models**. Previously, I was Head of Applied Research at [Pika Labs](https://pika.art/). Earlier, I worked on computational photography with [Marc Levoy](https://graphics.stanford.edu/~levoy/)'s team at Adobe and was a senior research engineer at Samsung Research America's MPI Lab.

I obtained my Ph.D. degree from [Electrical Engineering and Computer Sciences at UC Berkeley](https://eecs.berkeley.edu/), working with [Prof. Miki Lustig](http://people.eecs.berkeley.edu/~mlustig/) and [Prof. Stella Yu](https://web.eecs.umich.edu/~stellayu/). I was a member of [Berkeley Artificial Intelligence Research (BAIR)](https://bair.berkeley.edu/). I graduated with honors from the department of [Biomedical Engineering](http://www.med.tsinghua.edu.cn/) in [Tsinghua University](http://www.tsinghua.edu.cn/publish/thu2018en/index.html/). My research interests lie in **computational imaging, computational photography, deep learning, signal processing, inverse problems, medical imaging and computer vision**. I am an enthusiast of science, engineering, music, ice skating, rock climbing and everything related to medicine and healthcare! My name in Chinese is 王可.

**Summer 2027 research internships:** I’m actively looking to host research interns at Adobe, working on reinforcement learning and post-training for multimodal foundation models. Feel free to reach out at **kewang [at] adobe [dot] com**.

Personal contact: **kewang0622 [at] gmail [dot] com**.

<div class="home-projects" id="selected-projects" aria-label="Selected projects" markdown="0">
  <section class="home-project" aria-labelledby="mrfoundry-feature-title">
    <a class="home-project-image mri-project-image" href="{{ '/slides/mrfoundry/' | relative_url }}" aria-label="Open the MRFoundry interactive tutorial"><img src="{{ '/assets/img/mri-mascot.png' | relative_url }}" width="58" height="66" alt="" loading="lazy"></a>
    <div class="home-project-copy">
      <h2 id="mrfoundry-feature-title"><img class="mrfoundry-wordmark-light" src="{{ '/assets/img/mrfoundry-wordmark-light.svg' | relative_url }}" width="168" height="31" alt="MRFoundry"><img class="mrfoundry-wordmark-dark" src="{{ '/assets/img/mrfoundry-wordmark-dark.svg' | relative_url }}" width="168" height="31" alt="MRFoundry"></h2>
      <p>Tools and skills for MRI research.</p>
      <div class="home-project-links"><a href="{{ '/slides/mrfoundry/' | relative_url }}">Tutorial ↗</a><a href="{{ '/mrfoundry/examples/' | relative_url }}">Examples ↗</a><a href="https://github.com/KeWang0622/MRFoundry">GitHub ↗</a></div>
    </div>
  </section>
  <section class="home-project" aria-labelledby="film-feature-title">
    <a class="home-project-image film-project-image" href="{{ '/films/' | relative_url }}" aria-label="Watch the films"><img src="{{ '/films/assets/lisa-journey.webp' | relative_url }}" width="64" height="64" alt="A scene from Lisa’s Journey" loading="lazy"><span aria-hidden="true">▶</span></a>
    <div class="home-project-copy">
      <h2 id="film-feature-title">Films by Ke Wang</h2>
      <p>Five short films. My favorite: Lisa’s Journey.</p>
      <div class="home-project-links"><a href="{{ '/films/' | relative_url }}">Watch films ↗</a><a href="https://github.com/KeWang0622/ai-film">Open source ↗</a></div>
    </div>
  </section>
</div>
<style>
.home-projects {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  clear: both;
  scroll-margin-top: 100px;
  margin: 1.25rem 0;
  padding: 18px 0;
  border-top: 1px solid var(--global-divider-color, #ddd);
  border-bottom: 1px solid var(--global-divider-color, #ddd);
}
.home-projects .home-project {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.home-projects .home-project + .home-project {
  border-left: 1px solid var(--global-divider-color, #ddd);
  padding-left: 24px;
}
.home-projects .home-project-image { flex: 0 0 64px; }
.home-projects .home-project-image img { display: block; }
.home-projects .mri-project-image img { width: 58px; height: 66px; object-fit: contain; }
.home-projects .film-project-image { position: relative; border-radius: 8px; overflow: hidden; }
.home-projects .film-project-image img { width: 64px; height: 64px; object-fit: cover; }
.home-projects .film-project-image span { position: absolute; right: 5px; bottom: 5px; display: grid; place-items: center; width: 19px; height: 19px; padding-left: 1px; border-radius: 50%; background: #fff4df; color: #343b2b; font-size: 8px; }
.home-projects .home-project-copy { min-width: 0; }
.home-projects h2 { margin: 0; font-family: inherit; font-size: 1.25rem; font-weight: 700; line-height: 31px; letter-spacing: -.025em; color: var(--global-text-color); }
.home-projects h2 img { width: 168px; max-width: 100%; height: auto; }
.home-projects .mrfoundry-wordmark-light { display: block; }
.home-projects .mrfoundry-wordmark-dark { display: none; }
html[data-theme="dark"] .home-projects .mrfoundry-wordmark-light { display: none; }
html[data-theme="dark"] .home-projects .mrfoundry-wordmark-dark { display: block; }
.home-projects p { margin: 5px 0 8px; font-size: .78rem; line-height: 1.45; color: var(--global-text-color); opacity: .75; }
.home-projects .home-project-links { display: flex; flex-wrap: wrap; column-gap: 13px; row-gap: 5px; }
.home-projects .home-project-links a { font-size: .74rem; font-weight: 500; line-height: 1.4; white-space: nowrap; }
.home-projects a:focus-visible { outline: 2px solid var(--global-theme-color); outline-offset: 4px; border-radius: 3px; }
@media (max-width: 767px) {
  .home-projects { gap: 18px; }
  .home-projects .home-project { gap: 10px; }
  .home-projects .home-project + .home-project { padding-left: 18px; }
  .home-projects .home-project-image { flex-basis: 48px; }
  .home-projects .mri-project-image img { width: 46px; height: 53px; }
  .home-projects .film-project-image img { width: 48px; height: 58px; }
  .home-projects h2 { font-size: 1.125rem; }
  .home-projects h2 img { width: 150px; }
}
@media (max-width: 575px) {
  .home-projects { grid-template-columns: minmax(0, 1fr); gap: 14px; padding: 15px 0; }
  .home-projects .home-project + .home-project { border-left: 0; border-top: 1px solid var(--global-divider-color, #ddd); padding: 14px 0 0; }
  .home-projects .home-project { gap: 14px; }
  .home-projects p { margin-top: 3px; margin-bottom: 6px; }
}
</style>

<div class="kw-line" markdown="0"><span class="kw-label" title="Open-source projects I’ve contributed to. Repository stars checked {{ site.data.open_source.as_of }}.">Proud&nbsp;Contributor</span>{% for repo in site.data.open_source.contributions %}<a class="kw-chip" href="{{ repo.url }}" target="_blank" rel="noopener" title="{{ repo.repo }} — {{ repo.description | escape }} · {{ repo.stars }} repository stars as of {{ site.data.open_source.as_of }}"><span class="kw-emoji">{{ repo.emoji }}</span><span class="kw-name">{{ repo.repo | split: '/' | last }}</span><span class="kw-stars">{% if repo.stars >= 1000 %}{{ repo.stars | divided_by: 1000.0 | round: 1 }}k{% else %}{{ repo.stars }}{% endif %}</span></a>{% endfor %}</div>

<div class="kw-line" markdown="0"><span class="kw-label" title="Repository stars checked {{ site.data.open_source.as_of }}">Personal&nbsp;Projects</span>{% for repo in site.data.open_source.projects %}<a class="kw-chip kw-chip-feat" href="{{ repo.url }}" target="_blank" rel="noopener" title="{{ repo.description | escape }} · {{ repo.stars }} repository stars as of {{ site.data.open_source.as_of }}"><span class="kw-emoji">{{ repo.emoji }}</span><span class="kw-name">{{ repo.repo | split: '/' | last }}</span><span class="kw-stars">{{ repo.stars }}</span></a>{% endfor %}</div>

<style>
.kw-line{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:.55rem 0;}
.kw-label{font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#888;margin-right:6px;flex-shrink:0;}
.kw-chip{display:inline-flex;align-items:center;gap:6px;padding:3px 10px 3px 8px;border:1px solid #e2e2e2;border-radius:999px;background:#fafafa;font-size:.82rem;line-height:1.3;color:#222!important;text-decoration:none!important;transition:transform .1s ease,border-color .1s ease,background .1s ease,box-shadow .1s ease;}
.kw-chip:hover{border-color:#111;background:#fff;transform:translateY(-1px);box-shadow:0 2px 6px rgba(0,0,0,.06);text-decoration:none!important;}
.kw-chip-feat{background:#fff7e6;border-color:#f0d28a;}
.kw-chip-feat:hover{background:#fff;border-color:#b48310;}
.kw-emoji{font-size:.95rem;line-height:1;}
.kw-name{font-weight:600;}
.kw-stars{color:#888;font-size:.74rem;font-variant-numeric:tabular-nums;}
.kw-stars::before{content:"★\00a0";color:#e0a800;}
html[data-theme="dark"] .kw-label{color:#9a9a9a;}
html[data-theme="dark"] .kw-chip{background:#1d1d1d;border-color:#2e2e2e;color:#e8e8e8!important;}
html[data-theme="dark"] .kw-chip:hover{background:#262626;border-color:#f5f5f5;box-shadow:0 2px 6px rgba(0,0,0,.4);}
html[data-theme="dark"] .kw-chip-feat{background:#2a2316;border-color:#5a4515;}
html[data-theme="dark"] .kw-chip-feat:hover{background:#332a18;border-color:#f0d28a;}
html[data-theme="dark"] .kw-stars{color:#a8a8a8;}
</style>

<!--
Write your biography here. Tell the world about yourself. Link to your favorite [subreddit](http://reddit.com). You can put a picture in, too. The code is already in, just name your picture `prof_pic.jpg` and put it in the `img/` folder.test

Put your address / P.O. box / other info right below your picture. You can also disable any of these elements by editing `profile` property of the YAML header of your `_pages/about.md`. Edit `_bibliography/papers.bib` and Jekyll will render your [publications page](/al-folio/publications/) automatically.

Link to your social media connections, too. This theme is set up to use [Font Awesome icons](http://fortawesome.github.io/Font-Awesome/) and [Academicons](https://jpswalsh.github.io/academicons/), like the ones below. Add your Facebook, Twitter, LinkedIn, Google Scholar, or just disable all of them.
-->
