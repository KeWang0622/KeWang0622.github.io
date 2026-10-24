import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from './lib/three.module.js';
import {createWorldLife} from './world-life.js';
import {buildMeadow} from './meadow.js';

const matrices=group=>group.children.map(mesh=>Array.from(mesh.instanceMatrix.array));

test('wildlife is deterministic, bounded and does not use the world random sequence',()=>{
  const first=createWorldLife(),second=createWorldLife();
  try{
    assert.deepEqual(matrices(first),matrices(second));
    first.userData.update(8.4);second.userData.update(8.4);
    assert.deepEqual(matrices(first),matrices(second));
    for(const mesh of first.children){
      assert.equal(mesh.userData.decorative,true);
      assert.equal(mesh.castShadow,false);
      assert.ok(Array.from(mesh.instanceMatrix.array).every(Number.isFinite));
      assert.ok(mesh.boundingSphere.radius>=70);
    }
  }finally{first.userData.dispose();second.userData.dispose();}
});

test('the frozen ambient clock stops wildlife even when the player moves',()=>{
  const life=createWorldLife();
  try{
    life.userData.update(1);const frozen=matrices(life);
    life.userData.update(1,{player:new THREE.Vector3(-36,0,7),motion:false});
    assert.deepEqual(matrices(life),frozen);
    life.userData.update(2,{enabled:false});
    assert.equal(life.visible,false);assert.deepEqual(matrices(life),frozen);
    life.userData.update(2,{enabled:true});
    assert.equal(life.visible,true);assert.notDeepEqual(matrices(life),frozen);
  }finally{life.userData.dispose();}
});

test('both wing sides keep positive instance transforms throughout flight',()=>{
  const life=createWorldLife(),matrix=new THREE.Matrix4();
  try{
    for(const time of [0,.17,.4,1.1,2.7,8.4]){
      life.userData.update(time);
      for(const mesh of life.children.filter(mesh=>mesh.name.endsWith('-wings'))){
        for(let i=0;i<mesh.count;i++){
          mesh.getMatrixAt(i,matrix);
          assert.ok(matrix.determinant()>0,`${mesh.name} ${i} must not reflect its normals`);
        }
      }
    }
  }finally{life.userData.dispose();}
});

test('mobile keeps the same landscape with a smaller wildlife budget',()=>{
  const life=createWorldLife({mobile:true});
  try{
    assert.deepEqual(life.userData.wildlife,{butterflies:12,birds:2,drawCalls:4});
    assert.equal(life.children.length,4);
    const player=new THREE.Vector3(-36,0,7),before=player.clone();
    for(let i=1;i<20;i++)life.userData.update(i/60,{player});
    assert.ok(player.equals(before),'visual proximity cannot change the navigation position');
  }finally{life.userData.dispose();}
});

test('meadow actor fields bind once, appear locally, and release when motion is disabled',()=>{
  const scene=new THREE.Scene(),wind={value:0};
  const meadow=buildMeadow({scene,groundHeight:()=>0,roadDistance:()=>4,riverZ:()=>-200,nearBuilding:()=>false,pondRadius:()=>10,windUniform:wind});
  try{
    const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <normal_fragment_begin>'};
    meadow.children[0].material.onBeforeCompile(shader);
    const fields=shader.uniforms.uMeadowActors.value;
    assert.equal(fields.length,4);assert.equal(shader.uniforms.uMeadowTime,wind);
    meadow.userData.updateInteractors([new THREE.Vector3(40,0,-20)],1/60,true);
    assert.equal(fields[0].x,40);assert.equal(fields[0].z,-20);
    assert.ok(fields[0].w>0&&fields[0].w<.88);
    const strength=fields[0].w;
    meadow.userData.updateInteractors([],1/60,false);
    assert.ok(fields[0].w<strength,'grass springs back when the influence goes away');
    assert.equal(fields[1].w,0);
    assert.ok(scene.children.includes(meadow));
  }finally{meadow.userData.dispose();}
  assert.equal(scene.children.length,0);
});
