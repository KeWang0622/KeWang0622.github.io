"""Reconstruct saved KomaMRI ADC data using established SigPy operators/CG."""
from pathlib import Path
import json
import numpy as np
import sigpy as sp
import sigpy.mri as mr
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
O=Path(__file__).resolve().parent
s=np.load(O/'koma_signal.npz');t=np.load(O/'trajectory.npz')
y=s['signal'].astype(np.complex128)
# Array axes are y,x; convert cycles/m to SigPy grid coordinates using FOV.
coord=(t['k_adc'][[1,0]].T*.220).reshape(128,64,2)
assert y.shape==coord.shape[:-1] and np.isfinite(y).all()
# KomaMRI already applies ADC phase compensation. Do not demodulate twice.
A=sp.linop.NUFFT((64,64),coord,oversamp=1.5,width=4)
dcf=mr.dcf.pipe_menon_dcf(coord,img_shape=(64,64),max_iter=30,show_pbar=False)
dcf/=dcf.mean()
grid=A.H(dcf*y)
# Global least-squares scale allows a fair forward-fit comparison.
grid*=np.vdot(A(grid),y)/np.vdot(A(grid),A(grid))
lam=0.1
app=sp.app.LinearLeastSquares(A,y,lamda=lam,solver='ConjugateGradient',max_iter=300,tol=1e-8,save_objective_values=True,show_pbar=False)
x=app.run()
app2=sp.app.LinearLeastSquares(A,y,x=x.copy(),lamda=lam,solver='ConjugateGradient',max_iter=100,tol=1e-8,show_pbar=False)
x2=app2.run()
res=lambda a:float(np.linalg.norm(A(a)-y)/np.linalg.norm(y))
# Coordinate/order readiness check on the same radial operator, independent of Bloch data.
phantom=sp.shepp_logan((64,64)).astype(np.complex128)
check=sp.app.LinearLeastSquares(A,A(phantom),lamda=0,max_iter=100,tol=1e-8,show_pbar=False).run()
checkerr=float(np.linalg.norm(check-phantom)/np.linalg.norm(phantom))
checkres=float(np.linalg.norm(A(check)-A(phantom))/np.linalg.norm(A(phantom)))
assert checkres<.002,checkres
np.savez_compressed(O/'reconstruction.npz',image=x2,gridded=grid,coord_yx=coord,dcf=dcf,predicted_signal=A(x2),residual=A(x2)-y)
report=dict(engine='SigPy',version=sp.__version__,shape=[64,64],fov_mm=220,receive_channels=1,method='NUFFT conjugate-gradient least squares + L2',lambda_l2=lam,max_iterations=400,coordinate_conversion='(ky,kx) cycles/m multiplied by 0.220 m',adc_phase='Already compensated by KomaMRI; unchanged',gridding_relative_data_residual=res(grid),iterative_relative_data_residual=res(x2),relative_image_change_additional_100_iterations=float(np.linalg.norm(x2-x)/np.linalg.norm(x2)),same_trajectory_shepp_logan_roundtrip_error=checkerr,same_trajectory_shepp_logan_data_residual=checkres,limitations=['Coarse point-spin phantom; not spatially converged.','Static 2D Fourier model does not model spoke-dependent magnetization or within-readout relaxation/off-resonance.','No noise added, no multicoil encoding; no experimental SNR or g-factor estimate.','Phantom spin density is a spatial reference, not a GRE-contrast ground truth.'])
(O/'reconstruction_report.json').write_text(json.dumps(report,indent=2)+'\n')
fig,ax=plt.subplots(1,3,figsize=(14,5),layout='constrained')
base=s['z']==s['z'][0]
ax[0].scatter(s['x'][base]*1000,s['y'][base]*1000,c=s['ρ'][base],s=15,cmap='gray')
ax[0].set_title('Input spin density\ncoarse point phantom, not image truth')
vmax=np.percentile(np.abs(x2),99.8)
for a,img,title in zip(ax[1:],[grid,x2],['Density-compensated adjoint','Iterative NUFFT · L2 regularized']):
 im=a.imshow(np.abs(img),origin='lower',extent=[-110,110,-110,110],cmap='gray',vmin=0,vmax=vmax,interpolation='nearest');a.set_title(title)
for a in ax:a.set(xlim=(-110,110),ylim=(-110,110),xlabel='x (mm)',ylabel='y (mm)',aspect='equal')
fig.suptitle('Reconstruction of the actual KomaMRI signal · 128 spokes × 64 samples',fontsize=15)
fig.savefig(O/'reconstruction.png',dpi=170)
fig.savefig(O/'reconstruction.pdf')
print(json.dumps(report,indent=2))
