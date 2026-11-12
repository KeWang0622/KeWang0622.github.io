/* Public task requirements, not recorded agent runs or measured image results. */
'use strict';

const BENCHMARK_EXAMPLES = [
  {
    key: 'spiral', id: 'SEQ-05', title: 'From a spiral design to a checked image',
    request: 'Design an interleaved spiral acquisition, simulate the exported sequence, and reconstruct its data while accounting for gradient delays.',
    skills: 'Sequence design + reconstruction',
    source: 'https://github.com/KeWang0622/MRIAgentBench/blob/main/families/seq-05-spiral/task.example.json',
    outputs: ['sequence.seq', 'simulation.npz', 'image.npz', 'reconstruct.py'],
    stages: [
      { title: 'A research request with physical constraints', items: [
        ['Inputs', 'A numerical object, field of view and image grid, RF and timing requirements, and gradient-delay metadata.'],
        ['Constraints', 'Gradient and slew limits, timing, and a specified k-space coverage requirement.'],
        ['Required outcome', 'A sequence, its simulated measurements, an image, and a reconstruction program that accepts new measurements.']
      ] },
      { title: 'Connect acquisition, simulation and reconstruction', items: [
        ['Design', 'Choose interleaves and construct RF and gradient waveforms that meet the requested constraints.'],
        ['Simulate the export', 'Write sequence.seq, simulate that file with an established Bloch simulator, and save signals and trajectory metadata.'],
        ['Reconstruct', 'Use the recorded gradient delays to reconstruct the measurements; deliver a standalone program and the build/simulation scripts.']
      ] },
      { title: 'Check the artifact, then test it on a new object', items: [
        ['Sequence checks', 'Independently integrate the exported gradients; check timing, RF, hardware limits and sampling coverage.'],
        ['Signal checks', 'Replay the exported file in KomaMRI and compare its signals with the delivered simulation.'],
        ['Reuse checks', 'Rerun reconstruction on unseen objects with nonzero delays and compare with the corresponding zero-delay reconstruction.']
      ] }
    ],
    takeaway: 'The benchmark checks whether the stages agree and the delivered code works on new inputs.',
    notes: 'Public r4 task example. These panels summarize requirements, not an observed execution trace. The full deliverables also include a waveform figure, build and simulation scripts, a report and an environment record. The hidden-image check in this example uses normalized RMS difference no greater than 0.10 after least-squares scaling against the same object reconstructed from zero-delay data; it is not a generic 10% error against ground truth. Follow the linked specification for the complete conditions.'
  },
  {
    key: 'pdff', id: 'RECON-01', title: 'From raw echoes to quantitative maps',
    request: 'Turn multi-echo, multi-coil k-space into proton-density fat-fraction and R2* maps, with a pipeline that can be rerun on new data.',
    skills: 'Reconstruction + quantitative signal modeling',
    source: 'https://github.com/KeWang0622/MRIAgentBench/blob/main/families/recon-01-fat-fraction/task.example.json',
    outputs: ['dixon_pdff.py', 'pdff.npz', 'maps.png', 'report + environment'],
    stages: [
      { title: 'The input is raw data; the outcome is a measurement', items: [
        ['Inputs', 'Multi-echo k-space, receiver-noise samples, a relative B1 map, acquisition parameters and a multi-peak fat spectrum.'],
        ['Data conventions', 'Echo/coil/ky/kx axes, alternating readout polarity and readout oversampling must be interpreted correctly.'],
        ['Required outcome', 'Proton-density fat fraction (PDFF), R2* and field-map figures, plus a standalone quantitative reconstruction program.']
      ] },
      { title: 'Carry the signal model through the whole pipeline', items: [
        ['Prepare and reconstruct', 'Reverse negative-polarity readouts, handle oversampling, and account for correlated receiver noise when combining coil information.'],
        ['Fit the model', 'Use the supplied fat spectrum to estimate water/fat signals, R2* and off-resonance.'],
        ['Estimate PDFF', 'Account for flip angle, B1 and water/fat T1; read acquisition parameters from each input instead of hard-coding one dataset.']
      ] },
      { title: 'Verify the saved maps and rerun the program', items: [
        ['Read the outputs', 'Inspect the saved PDFF and R2* maps and confirm that the expected files and program are present.'],
        ['Check numerical accuracy', 'Compare per-vial median PDFF and R2* against the numerical truth under the task’s tolerances.'],
        ['Check generalization', 'Rerun the same program on supplied and unseen datasets, within the specified CPU time limit.']
      ] }
    ],
    takeaway: 'The benchmark checks quantitative estimates and reproducibility across inputs.',
    notes: 'Public r4 task example, not measured images or a recorded agent trace. pdff.npz contains PDFF and R2*; maps.png includes the field map. This example requires per-vial PDFF within 1.5 percentage points and R2* within max(6 s⁻¹, 10%), with each rerun within 15 minutes on one CPU core. These are example-specific thresholds; the linked task specification is authoritative. Reports, README and environment records are also required.'
  }
];

function benchmarkIllustration(key) {
  if (key === 'spiral') {
    const arms = Array.from({length: 4}, (_, arm) => {
      const points = Array.from({length: 150}, (_, i) => {
        const r = 104 * i / 149;
        const a = 4 * Math.PI * i / 149 + arm * Math.PI / 2;
        return `${i ? 'L' : 'M'}${(170 + r * Math.cos(a)).toFixed(2)},${(132 + r * Math.sin(a)).toFixed(2)}`;
      }).join(' ');
      return `<path d="${points}" stroke="${['#a9ccff','#75bfc4','#d5dfed','#6287b4'][arm]}"/>`;
    }).join('');
    return `<svg viewBox="0 0 340 290" role="img" aria-label="Schematic interleaved spiral trajectory; not a measured task output">
      <g stroke="#334354" stroke-width="1"><path d="M45 132H295M170 7V257"/><circle cx="170" cy="132" r="104" fill="none" stroke-dasharray="3 6"/></g>
      <g fill="none" stroke-width="1.7">${arms}</g>
      <g fill="#93a0ad" font-size="13" font-family="sans-serif"><text x="294" y="149">kx</text><text x="179" y="16">ky</text><text x="170" y="282" text-anchor="middle">Interleaved spiral · schematic</text></g>
    </svg>`;
  }
  return `<svg viewBox="0 0 340 290" role="img" aria-label="Schematic multi-echo inputs leading to PDFF and R2-star maps; not measured images">
    <g fill="#142336" stroke="#7fa6d8" stroke-width="1.5">
      <rect x="34" y="35" width="105" height="108" rx="4"/><rect x="52" y="53" width="105" height="108" rx="4"/><rect x="70" y="71" width="105" height="108" rx="4"/>
      <path d="M91 98h63M91 115h63M91 132h63M91 149h63" stroke="#7fa6d8" stroke-dasharray="2 4"/>
    </g>
    <g fill="#cad7e8" font-size="14" font-family="sans-serif" text-anchor="middle"><text x="112" y="207">Echoes × coils</text><text x="112" y="228" fill="#93a0ad" font-size="12">Raw k-space + metadata</text></g>
    <path d="M188 126H217m-6-5 6 5-6 5" fill="none" stroke="#a9ccff" stroke-width="1.5"/>
    <g fill="#142a2e" stroke="#75bfc4" stroke-width="1.5"><rect x="232" y="70" width="82" height="53" rx="5"/><rect x="232" y="137" width="82" height="53" rx="5"/></g>
    <g fill="#dce8ee" font-size="17" font-family="sans-serif" text-anchor="middle"><text x="273" y="102">PDFF</text><text x="273" y="170">R2*</text></g>
    <text x="170" y="282" text-anchor="middle" fill="#93a0ad" font-size="13" font-family="sans-serif">Quantitative reconstruction · schematic</text>
  </svg>`;
}

function benchmarkStageHTML(example, index) {
  const stage = example.stages[index];
  return `<p class="bench-panel-kicker">${['The task','The work','The verification'][index]}</p>
    <h2>${stage.title}</h2>
    <dl>${stage.items.map(([label, text]) => `<div><dt>${label}</dt><dd>${text}</dd></div>`).join('')}</dl>`;
}

function benchmarkExampleHTML(example) {
  return `<header class="bench-heading"><p class="kicker">MRI Agent Bench · public Core example · ${example.id}</p>
    <h1>${example.title}</h1><p class="bench-request">“${example.request}”</p></header>
    <div class="bench-body">
      <aside class="bench-visual">${benchmarkIllustration(example.key)}<p class="bench-skills">${example.skills}</p>
        <p class="bench-takeaway">${example.takeaway}</p></aside>
      <div class="bench-walkthrough">
        <div class="bench-stages" role="group" aria-label="Explore ${example.id} task">
          ${['Task brief','Agent work','Verification'].map((label, i) => `<button type="button" data-bench-key="${example.key}" data-bench-stage="${i}" aria-pressed="${i === 0}" aria-controls="bench-panel-${example.key}"><span>0${i+1}</span>${label}</button>`).join('')}
        </div>
        <div class="bench-panel" id="bench-panel-${example.key}" aria-live="polite">${benchmarkStageHTML(example, 0)}</div>
      </div>
    </div>
    <div class="bench-outputs"><span>Deliverables include</span>${example.outputs.map(name => `<code>${name}</code>`).join('')}</div>
    <p class="bench-source">Task requirements and checks · illustrative diagram <a href="${example.source}" target="_blank" rel="noopener">Read the full task ↗</a></p>`;
}

// Delegation lets the deck construct slides before the controls are used.
document.addEventListener('click', event => {
  const button = event.target.closest('button[data-bench-key]');
  if (!button) return;
  const example = BENCHMARK_EXAMPLES.find(item => item.key === button.dataset.benchKey);
  const index = Number(button.dataset.benchStage);
  if (!example || !example.stages[index]) return;
  button.closest('.bench-stages').querySelectorAll('button').forEach(item => {
    item.setAttribute('aria-pressed', String(item === button));
  });
  document.getElementById(`bench-panel-${example.key}`).innerHTML = benchmarkStageHTML(example, index);
});
