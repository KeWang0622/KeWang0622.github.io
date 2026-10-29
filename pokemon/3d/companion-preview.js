import * as THREE from './lib/three.module.js';
import {GLTFLoader} from './lib/addons/loaders/GLTFLoader.js';
import {createCameraCompanion} from './camera-companion.js';
import {createMacCompanion,createPrismCompanion,createMusicCompanion} from './companion-models.js';

/* An on-demand model viewer. Nothing keeps rendering behind a closed backpack. */
export async function createCompanionPreview(canvas,onPortraits){
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.01,30);
  scene.add(new THREE.HemisphereLight(0xffffff,0xa8b5c2,2.4));
  const key=new THREE.DirectionalLight(0xfff7e8,3.2);key.position.set(-3,5,6);scene.add(key);
  const fill=new THREE.DirectionalLight(0xcceaff,2.1);fill.position.set(4,3,-2);scene.add(fill);
  const mri=(await new GLTFLoader().loadAsync('./assets/companion.glb?v=20261029-mri-long-bore')).scene;
  const models={mri,camera:createCameraCompanion(),mac:createMacCompanion(),prism:createPrismCompanion(),music:createMusicCompanion()};
  const rigs={};
  for(const [id,model] of Object.entries(models)){
    const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    const fit=1/Math.max(size.x,size.y,size.z);
    model.scale.multiplyScalar(fit);model.position.sub(center.multiplyScalar(fit));
    const rig=new THREE.Group();rig.add(model);rig.visible=false;scene.add(rig);rigs[id]=rig;
  }
  let current='mri',drag=null,paused=false,frame=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setCamera(aspect){camera.aspect=aspect;camera.position.set(1,.58,1.8).normalize().multiplyScalar(Math.max(2.25,1.65/aspect));camera.lookAt(0,0,0);camera.updateProjectionMatrix();}
  function render(){if(!paused)renderer.render(scene,camera);}
  function resize(){const {width,height}=canvas.getBoundingClientRect();if(width<1||height<1)return;renderer.setSize(width,height,false);setCamera(width/height);render();}
  const portraits={};renderer.setPixelRatio(1);renderer.setSize(240,240,false);setCamera(1);
  for(const [id,rig] of Object.entries(rigs)){rig.visible=true;renderer.render(scene,camera);portraits[id]=canvas.toDataURL('image/webp',.9);rig.visible=false;}
  onPortraits(portraits);renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  function select(id){
    if(!rigs[id])return;
    cancelAnimationFrame(frame);current=id;
    for(const [key,rig] of Object.entries(rigs)){rig.visible=key===id;rig.scale.setScalar(1);rig.rotation.set(0,0,0);}
    resize();
    if(reduced||paused)return;
    const start=performance.now();
    function reveal(now){if(paused)return;const p=Math.min(1,(now-start)/180);rigs[current].scale.setScalar(.94+.06*(1-(1-p)**3));render();if(p<1)frame=requestAnimationFrame(reveal);}
    frame=requestAnimationFrame(reveal);
  }
  function turn(amount){rigs[current].rotation.y+=amount;render();}
  canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,id:e.pointerId};canvas.setPointerCapture(e.pointerId);canvas.classList.add('turning');});
  canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;turn((e.clientX-drag.x)*.013);drag.x=e.clientX;});
  function release(){drag=null;canvas.classList.remove('turning');}
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
  canvas.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();turn(e.key==='ArrowLeft'?-.35:.35);}});
  const observer=new ResizeObserver(resize);observer.observe(canvas);
  select(current);
  return {select,turn,resume(){paused=false;resize();},pause(){paused=true;cancelAnimationFrame(frame);release();}};
}
