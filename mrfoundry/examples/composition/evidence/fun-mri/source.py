"""A playful MRI-letter sequence and a clearly scoped static NUFFT reconstruction.

Uses PyPulseq's exported sequence trajectory and SigPy's established solver.
This is not Bloch simulation, acquired data, or a useful clinical acquisition.
"""
from pathlib import Path
import hashlib
import importlib.metadata as md
import json
import platform
import time
import numpy as np
import pypulseq as pp
import sigpy as sp
import sigpy.mri as mr
from PIL import Image
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

OUT = Path(__file__).resolve().parent
N, FOV, TR = 64, 0.220, 6.5
SAMPLES_PER_STROKE, DWELL, RISE, FLAT = 100, 10e-6, 100e-6, 1e-3
MAX_ITER, TOL = 800, 1e-8
paths, labels = [], []

def letter(label, segments):
    paths.extend(segments)
    labels.extend([label] * len(segments))

letter('M', [
    [[-.90, -.40], [-.90, .40]], [[-.90, .40], [-.625, -.08]],
    [[-.625, -.08], [-.35, .40]], [[-.35, .40], [-.35, -.40]],
])
letter('R', [
    [[-.12, -.40], [-.12, .40]], [[-.12, .40], [.13, .40]],
    [[.13, .40], [.30, .25]], [[.30, .25], [.13, .08]],
    [[.13, .08], [-.12, .08]], [[-.12, .08], [.32, -.40]],
])
letter('I', [
    [[.52, .40], [.88, .40]], [[.70, .40], [.70, -.40]],
    [[.52, -.40], [.88, -.40]],
])
paths = np.array(paths) * N / (2 * FOV)
COLORS = {'M': '#147b82', 'R': '#146cba', 'I': '#bb8530'}
system = pp.Opts(max_grad=32, grad_unit='mT/m', max_slew=130,
                 slew_unit='T/m/s', rf_dead_time=100e-6,
                 rf_ringdown_time=30e-6, adc_dead_time=10e-6)

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def build(shots):
    sequence = pp.Sequence(system)
    rf, gz, gzr = pp.make_sinc_pulse(
        np.pi / 2, duration=.003, slice_thickness=.005, apodization=.5,
        time_bw_product=4, return_gz=True, system=system,
        delay=100e-6, use='excitation',
    )
    adc = pp.make_adc(SAMPLES_PER_STROKE, dwell=DWELL, delay=RISE, system=system)
    expected, rotated_paths, durations = [], [], []
    angles = np.arange(shots) * np.pi / ((1 + np.sqrt(5)) / 2)
    for angle in angles:
        rotation = np.array([[np.cos(angle), -np.sin(angle)], [np.sin(angle), np.cos(angle)]])
        shot_paths = paths @ rotation.T
        rotated_paths.append(shot_paths)
        start = sequence.duration()[0] if sequence.block_events else 0.0
        sequence.add_block(rf, gz)
        sequence.add_block(gzr)
        pos = np.zeros(2)
        for p, q in shot_paths:
            amp = (q - p) / FLAT
            target = p - amp * RISE / 2
            move = target - pos
            events = [pp.make_trapezoid(axis, area=float(area), duration=.001, system=system)
                      for axis, area in zip(['x', 'y'], move) if abs(area) > 1e-10]
            sequence.add_block(*(events or [pp.make_delay(.001)]))
            events = [pp.make_trapezoid(axis, amplitude=float(a), rise_time=RISE,
                                       flat_time=FLAT, fall_time=RISE, system=system)
                      for axis, a in zip(['x', 'y'], amp) if abs(a) > 1e-10]
            sequence.add_block(*events, adc)
            pos = q + amp * RISE / 2
            expected.append(p[:, None] + (q-p)[:, None] * ((np.arange(SAMPLES_PER_STROKE)+.5)/SAMPLES_PER_STROKE))
        sequence.add_block(pp.make_trapezoid('z', area=800, duration=.002, system=system))
        duration = sequence.duration()[0] - start
        durations.append(duration)
        sequence.add_block(pp.make_delay(round((TR-duration)/system.block_duration_raster) * system.block_duration_raster))
    ok, errors = sequence.check_timing()
    assert ok, errors
    sequence.set_definition('Name', f'MRI_fun_{shots}_shots')
    sequence.set_definition('FOV', [FOV, FOV, .005])
    seq_path = OUT / f'MRI_{shots}shot.seq'
    sequence.write(str(seq_path), v141_compat=True)
    exported = pp.Sequence(system)
    exported.read(str(seq_path))
    for bid in exported.block_events:
        block = exported.get_block(bid)
        if block.rf is not None:
            block.rf.use = 'excitation'
            exported.set_block(bid, block)
    ok, errors = exported.check_timing()
    assert ok, errors
    k_adc, _, excitation, _, t_adc = exported.calculate_kspace()
    expected = np.concatenate(expected, axis=1)
    trajectory_error = float(np.max(np.abs(k_adc[:2] - expected)))
    assert k_adc.shape == (3, shots * len(paths) * SAMPLES_PER_STROKE)
    assert trajectory_error < .01, trajectory_error
    assert np.max(np.abs(k_adc[2])) < .01
    waveforms = exported.waveforms(append_RF=True)
    max_gradient = float(max(np.max(np.abs(w[1])) / system.gamma * 1000 for w in waveforms[:3]))
    max_slew = float(max(np.max(np.abs(np.diff(w[1])/np.diff(w[0]))) / system.gamma for w in waveforms[:3]))
    assert max_gradient <= 32.001 and max_slew <= 130.001
    np.savez_compressed(OUT / f'trajectory_{shots}shot.npz', k_adc=k_adc,
                        t_adc=t_adc, RF_center_times=excitation,
                        stroke_vertices=np.array(rotated_paths), angles_rad=angles,
                        letter_labels=labels)
    check = dict(shots=shots, strokes_per_shot=len(paths), samples=k_adc.shape[1],
                 timing_passed=ok, max_gradient_mTm=max_gradient, max_slew_T_m_s=max_slew,
                 trajectory_max_error_cycles_m=trajectory_error,
                 active_ms_per_shot=[d*1000 for d in durations],
                 TR_s=TR, duration_s=exported.duration()[0],
                 sequence_sha256=sha(seq_path),
                 scope='Per-axis gradient/slew and PyPulseq timing checks only; no PNS, SAR, scanner or clinical validation.')
    return k_adc, check, waveforms

def png(name, array, vmax=1):
    pixels = np.round(np.clip(np.abs(array) / vmax, 0, 1) * 255).astype(np.uint8)
    Image.fromarray(pixels).resize((512,512), Image.Resampling.NEAREST).save(OUT / name)

def reconstruct(k_adc, reference, shots):
    coords = np.ascontiguousarray(k_adc[[1,0]].T * FOV)
    A = mr.linop.Sense(np.ones((1,N,N), dtype=np.complex128), coord=coords)
    signal = A(reference)
    rng = np.random.default_rng(2026)
    x = rng.normal(size=(N,N)) + 1j*rng.normal(size=(N,N))
    y = rng.normal(size=signal.shape) + 1j*rng.normal(size=signal.shape)
    lhs, rhs = np.vdot(A(x), y), np.vdot(x, A.H(y))
    adjoint_error = float(abs(lhs-rhs) / max(abs(lhs), abs(rhs), 1e-15))
    assert adjoint_error < 1e-10
    start = time.perf_counter()
    app = sp.app.LinearLeastSquares(A, signal, lamda=0, solver='ConjugateGradient',
                                    max_iter=MAX_ITER, tol=TOL,
                                    save_objective_values=True, show_pbar=False)
    result = app.run()
    assert np.isfinite(result).all()
    png(f'reconstruction_{shots}shot.png', result)
    png(f'error_{shots}shot.png', np.abs(np.abs(result)-np.abs(reference)), .5)
    stats = dict(shots=shots, samples=int(signal.size),
                 relative_data_residual=float(np.linalg.norm(A(result)-signal)/np.linalg.norm(signal)),
                 magnitude_nrmse=float(np.linalg.norm(np.abs(result)-np.abs(reference))/np.linalg.norm(reference)),
                 iterations=int(app.alg.iter), iteration_budget_reached=bool(app.alg.iter>=MAX_ITER),
                 objective_history=[float(v) for v in app.objective_values],
                 adjoint_relative_error=adjoint_error, elapsed_s=time.perf_counter()-start)
    np.savez_compressed(OUT/f'recon_{shots}shot.npz', image=result, signal=signal, coords=coords)
    return result, stats

reference = sp.shepp_logan((N,N), dtype=np.complex128)
png('reference.png', reference)
recons, checks, reports = [], [], []
for shots in [1,20]:
    k_adc, check, w = build(shots)
    checks.append(check)
    if shots == 1:
        trajectory = dict(word='MRI', letters=labels, strokes=[{'letter':label,'kx':k_adc[0,i*100:(i+1)*100].tolist(),'ky':k_adc[1,i*100:(i+1)*100].tolist()} for i,label in enumerate(labels)], units='cycles/m')
        (OUT/'trajectory.json').write_text(json.dumps(trajectory))
        fig,ax = plt.subplots(figsize=(10,5),facecolor='#f8f7f2')
        ax.set_facecolor('#f8f7f2')
        for i,label in enumerate(labels):
            xy=k_adc[:2,i*100:(i+1)*100]
            ax.plot(xy[0],xy[1],lw=5,color=COLORS[label])
        ax.set_aspect('equal');ax.set_xlim(-145,145);ax.set_ylim(-75,75)
        ax.set_xlabel('kx (cycles/m)');ax.set_ylabel('ky (cycles/m)')
        ax.spines[['top','right']].set_visible(False);ax.grid(alpha=.15)
        fig.tight_layout();fig.savefig(OUT/'trajectory.png',dpi=180);plt.close(fig)
        fig,axes=plt.subplots(4,1,figsize=(10,6),sharex=True,facecolor='#f8f7f2')
        axes[0].plot(w[3][0].real*1000,w[3][1].real/system.gamma*1e6,color='#146cba')
        axes[0].set_ylabel('RF (µT)')
        for i,label in enumerate(['Gx','Gy','Gz']):
            axes[i+1].plot(w[i][0]*1000,w[i][1]/system.gamma*1000,color='#147b82')
            axes[i+1].set_ylabel(label+' (mT/m)')
        for ax in axes:
            ax.set_xlim(0,check['active_ms_per_shot'][0]+.5);ax.spines[['top','right']].set_visible(False);ax.grid(alpha=.12)
        axes[-1].set_xlabel('Time (ms), recovery delay omitted')
        fig.tight_layout();fig.savefig(OUT/'sequence.png',dpi=160);plt.close(fig)
    recon, report = reconstruct(k_adc, reference, shots)
    recons.append(recon);reports.append(report)
    print(json.dumps({'checks':check,'recon':{k:v for k,v in report.items() if k!='objective_history'}}),flush=True)

fig,axes=plt.subplots(1,3,figsize=(12,4.4),facecolor='#f8f7f2')
for ax,im,label in zip(axes,[reference,*recons],['Synthetic reference','One MRI word','20 rotated MRI words']):
    ax.imshow(np.abs(im),cmap='gray',vmin=0,vmax=1,interpolation='nearest')
    ax.set_title(label,fontsize=13);ax.axis('off')
fig.suptitle('A fun trajectory, then a reconstruction',fontsize=19)
fig.tight_layout();fig.savefig(OUT/'comparison.png',dpi=180);plt.close(fig)
(OUT/'checks.json').write_text(json.dumps(checks,indent=2))
(OUT/'results.json').write_text(json.dumps(dict(
    word='MRI', date='2026-10-12', title='A playful three-letter MRI sequence and static reconstruction',
    scope='New static discrete Fourier/NUFFT synthetic reconstruction at actual exported PyPulseq trajectories. Not Bloch simulation or acquired MRI.',
    phantom='SigPy Shepp-Logan geometric phantom64x64; no external anatomy or patient data.',
    model='One unit-sensitivity coil; same SigPy Sense/NUFFT forward operator generates and reconstructs noiseless signals.',
    coordinates='(ky,kx) cycles/m multiplied by0.220m FOV gives SigPy(y,x) grid coordinates.',
    settings=dict(N=N,FOV_m=FOV,max_iter=MAX_ITER,tol=TOL,lamda=0,solver='SigPy LinearLeastSquares ConjugateGradient'),
    display='Same absolute magnitude0..1 window; no intensity fitting; nearest-neighbor enlargement.',
    checks=checks,results=reports,
    limitations=['Fun geometry is not proposed as a clinically useful acquisition.','Same forward/inverse operator; no independent model validation.','No noise, relaxation, motion, off-resonance, hardware response or Bloch physics.','20 shots take20times the sequence time; comparison is not equal-time.','Iteration-limit termination is reported; no convergence claim when budget is reached.','Low data residual alone does not imply faithful image recovery.'],
    references=[{'title':'Pulseq, Layton et al.','url':'https://doi.org/10.1002/mrm.26235'},{'title':'PyPulseq','url':'https://github.com/imr-framework/pypulseq'},{'title':'SigPy','url':'https://github.com/mikgroup/sigpy'},{'title':'Shepp and Logan1974','url':'https://doi.org/10.1109/TNS.1974.6499235'}],
    versions={'python':platform.python_version(),**{p:md.version(p) for p in ['numpy','scipy','sigpy','pypulseq','Pillow','matplotlib']}},
    source_sha256=sha(__file__),
),indent=2))
(OUT/'requirements.txt').write_text('\n'.join(f'{p}=={md.version(p)}' for p in ['numpy','scipy','sigpy','pypulseq','Pillow','matplotlib','numba','PyWavelets'])+'\n')
