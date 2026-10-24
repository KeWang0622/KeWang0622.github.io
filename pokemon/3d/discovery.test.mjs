import test from 'node:test';
import assert from 'node:assert/strict';
import { createDiscoveryTracker, createPostcardTracker, DISCOVERY_STORAGE_KEY } from './discovery.js';

const places = [
  {id:'pond', title:'Pond', entry:[35,30.5]},
  {id:'grove', title:'Grove', entry:[-48,37.4]}
];
const atPond = {x:35,z:30.5};
function settle(tracker, position = atPond, options = {}) {
  for (let i=0;i<9;i++) tracker.update(position,{delta:.1,...options});
}
function memoryStore(initial) {
  let value = initial;
  return {getItem:key=>key===DISCOVERY_STORAGE_KEY?value:null,setItem:(key,next)=>{assert.equal(key,DISCOVERY_STORAGE_KEY);value=next;},value:()=>value};
}

test('approaching and pausing by the actual entry earns one stamp, once',()=>{
  const discovered=[],tracker=createDiscoveryTracker({places,storage:null,onDiscover:place=>discovered.push(place.id)});
  tracker.update(atPond,{delta:.1}); assert.deepEqual(tracker.snapshot(),[]);
  settle(tracker); settle(tracker);
  assert.deepEqual(tracker.snapshot(),['pond']); assert.deepEqual(discovered,['pond']);
});

test('flying high overhead, indoor rooms and paused journals do not earn stamps',()=>{
  for(const options of [{indoors:true},{paused:true},{altitude:9}]){
    const tracker=createDiscoveryTracker({places,storage:null}); settle(tracker,atPond,options);
    assert.deepEqual(tracker.snapshot(),[]); settle(tracker); assert.deepEqual(tracker.snapshot(),['pond']);
  }
});

test('leaving a destination or opening a modal resets the dwell',()=>{
  const tracker=createDiscoveryTracker({places,storage:null});
  for(let i=0;i<5;i++)tracker.update(atPond,{delta:.1});
  tracker.update({x:0,z:0},{delta:.1});
  for(let i=0;i<5;i++)tracker.update(atPond,{delta:.1});
  assert.deepEqual(tracker.snapshot(),[]);
  tracker.update(atPond,{delta:.1,paused:true});
  for(let i=0;i<5;i++)tracker.update(atPond,{delta:.1});
  assert.deepEqual(tracker.snapshot(),[]); settle(tracker); assert.deepEqual(tracker.snapshot(),['pond']);
});

test('a resumed frame cannot instantly collect a note; malformed positions are ignored',()=>{
  const tracker=createDiscoveryTracker({places,storage:null});
  tracker.update(atPond,{delta:1000});
  tracker.update({x:NaN,z:30.5},{delta:1});
  tracker.update(atPond,{delta:Infinity});
  tracker.update(atPond,{delta:-1});
  tracker.update(null,{delta:1});
  assert.deepEqual(tracker.snapshot(),[]);
});

test('only allowlisted IDs persist, without coordinates, photos or timestamps',()=>{
  const store=memoryStore(JSON.stringify({version:1,ids:['grove','unknown','grove',{},null]}));
  const tracker=createDiscoveryTracker({places,storage:store});
  assert.deepEqual(tracker.snapshot(),['grove']); settle(tracker);
  assert.deepEqual(JSON.parse(store.value()),{version:1,ids:['grove','pond']});
});

test('clear can be undone and both transitions survive reload',()=>{
  const store=memoryStore(null),tracker=createDiscoveryTracker({places,storage:store});settle(tracker);
  const undo=tracker.clear();assert.deepEqual(tracker.snapshot(),[]);
  assert.deepEqual(createDiscoveryTracker({places,storage:store}).snapshot(),[]);
  tracker.restore([...undo,'unknown']);
  assert.deepEqual(createDiscoveryTracker({places,storage:store}).snapshot(),['pond']);
});

test('disabled or corrupt localStorage cannot break movement or discovery',()=>{
  for(const storage of [null,memoryStore('not-json'),{getItem(){throw Error('disabled');},setItem(){throw Error('full');}}]){
    const tracker=createDiscoveryTracker({places,storage});assert.doesNotThrow(()=>settle(tracker));
    assert.deepEqual(tracker.snapshot(),['pond']);
  }
});

test('invalid and duplicate destination records cannot add false rewards',()=>{
  const tracker=createDiscoveryTracker({storage:null,places:[null,...places,places[0],{id:'bad',entry:[NaN,2]},{id:'short',entry:[0]}]});
  assert.equal(tracker.places.length,2);settle(tracker);assert.deepEqual(tracker.snapshot(),['pond']);
});

test('postcards wait until arrival and 1.2 seconds of stationary camera settling',()=>{
  const captures=[],tracker=createPostcardTracker({places,onCapture:place=>captures.push(place.id)});
  for(let i=0;i<30;i++)tracker.update(atPond,{delta:.1,moving:true});
  assert.deepEqual(captures,[],'an approaching walker must not photograph the foreground');
  for(let i=0;i<11;i++)tracker.update(atPond,{delta:.1,moving:false});
  assert.deepEqual(captures,[]);
  tracker.update(atPond,{delta:.1,moving:false});
  assert.deepEqual(captures,['pond']);
  settle(tracker);assert.deepEqual(captures,['pond'],'capture only once per place per session');
});

test('moving again restarts the postcard settling period without removing a stamp',()=>{
  const stamps=createDiscoveryTracker({places,storage:null});settle(stamps);
  const captures=[],tracker=createPostcardTracker({places,onCapture:place=>captures.push(place.id)});
  for(let i=0;i<8;i++)tracker.update(atPond,{delta:.1,moving:false});
  tracker.update(atPond,{delta:.1,moving:true});
  for(let i=0;i<5;i++)tracker.update(atPond,{delta:.1,moving:false});
  assert.deepEqual(captures,[]);assert.deepEqual(stamps.snapshot(),['pond']);
  for(let i=0;i<7;i++)tracker.update(atPond,{delta:.1,moving:false});
  assert.deepEqual(captures,['pond']);
});

test('a destination stamped on an earlier visit still earns a fresh session postcard',()=>{
  const store=memoryStore(JSON.stringify({version:1,ids:['pond']})),newStamps=[],captures=[];
  const stamps=createDiscoveryTracker({places,storage:store,onDiscover:place=>newStamps.push(place.id)});
  const postcards=createPostcardTracker({places,onCapture:place=>captures.push(place.id)});
  for(let i=0;i<15;i++){
    const options={delta:.1,moving:false};stamps.update(atPond,options);postcards.update(atPond,options);
  }
  assert.deepEqual(newStamps,[]);assert.deepEqual(captures,['pond']);
});
