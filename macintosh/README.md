# Ke’s Macintosh

Classic Macintosh research desktop. Structured content is in `mac/data.js`; UI source is in `mac/*.jsx` and `mac/styles.css`.

Rebuild the committed browser scripts after editing JSX:

```sh
npx --yes esbuild@0.28.2 macintosh/mac/wm.jsx macintosh/mac/apps.jsx macintosh/mac/main.jsx --outdir=macintosh/dist --format=iife --minify
```

React 18.3.1 production UMD assets are self-hosted in `lib/` (MIT license). JSX is precompiled, so the public site does not load Babel or development React.

## Data provenance

Verified 2026-09-23:
- [Google Scholar profile](https://scholar.google.com/citations?user=Iz3m3v4AAAAJ): 476 citations; h-index 10; i10-index 10; annual and per-publication counts.
- [PhotoFramer, CVPR 2026](https://openaccess.thecvf.com/content/CVPR2026/html/You_PhotoFramer_Multi-modal_Image_Composition_Instruction_CVPR_2026_paper.html).
- [Hist2Style project](https://dgalor.github.io/hist2style/) and [paper](https://arxiv.org/abs/2606.01819).
- [GyroDVD official repository](https://github.com/rimchang/GyroDVD): CVPR 2026 title and authors.
- [Personal-site CV](https://kewang0622.github.io/cv/) and homepage: career and service updates.

Counts are dated snapshots, not live API results. Blank Scholar counts are represented as null, not fabricated zeros. The curated list contains 20 works including abstracts and the dissertation, omits the duplicate Data Crimes Scholar entry, and is not used to compute the profile citation total. Future data edits should update the single data object and its date; counters throughout the UI read that object.

### September 2026 desktop iteration

The Finder is now the starting point: biography, project directory, research library and desk accessories. Command/Ctrl-K searches applications and publication titles, authors and venues; selecting a paper opens its preview. Papers can be saved to a local reading list (`kw-reading-list`), and Control Panel preferences persist locally (`kw-display`). There is no model API or visitor data service behind these features.

The visual direction references the clarity of TypeSafe's Jev introduction: muted gray-green, crisp rules, restrained typography and classic Macintosh controls. It does not integrate Jev or reproduce their artwork. Desktop and 390 px mobile views were checked, along with paper search, saved-list persistence, and window zoom. JSX changes require rebuilding `dist` using the command above.
