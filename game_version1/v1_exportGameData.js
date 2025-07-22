// exportGameData.js   – 2025-07-07  (rev-I: adds correctHL / correctLL)

// ─── 0. Deps ───────────────────────────────────────────────────────────────
const admin                     = require('firebase-admin');
const { createObjectCsvWriter } = require('csv-writer');

// ─── 1. Firebase Admin init ────────────────────────────────────────────────
const serviceAccount = require('../../firebase_key/serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ─── 2. Questionnaire keys ────────────────────────────────────────────────
const worryItems = Array.from({ length: 8  }, (_, i) => `worry${i + 1}`);
const physItems  = Array.from({ length: 10 }, (_, i) => `phys${i + 1}`);

// ─── 3. Generic helpers ───────────────────────────────────────────────────
const score   = (keys, src) => keys.reduce((s, k) => s + (Number(src[k]) || 0), 0);
const flatten = (obj, prefix='') => Object.entries(obj||{}).reduce((acc,[k,v])=>{
  const key = prefix ? `${prefix}_${k}` : k;
  acc[key] = v==null ? '' : typeof v==='object' ? JSON.stringify(v) : v;
  return acc;
}, {});

// ─── extractTrials, movesToSeqAndRT (unchanged) ───────────────────────────
function extractTrials(g){ if(!g) return []; if(Array.isArray(g.trials)) return g.trials;
  const map={practice:0,phase1:1,phase2:2},out=[]; for(const[p,a]of Object.entries(g)){
    if(Array.isArray(a)){const id=map[p]??p; a.forEach(t=>out.push({phase:id,...t}))}}
  return out}
function movesToSeqAndRT(m){ if(!Array.isArray(m)||!m.length) return['',''];
  return [m.map(r=>r.keyPressed||'').join(''), m[m.length-1].time];}

// ─── 4. Vehicle helpers ───────────────────────────────────────────────────
const CAR_TYPES=['small_car','big_car','medium_car'];
const TRUCK_TYPES=['truck','pickup_truck','dump_truck'];
function getVehicleLabel(t){
  const base=(t.vehicleType||'').toLowerCase();
  if(base==='car'){const s=(t.vehicleSize||'').toLowerCase();
    if(['small','big','medium'].includes(s)) return `${s}_car`;}
  return base;}

function allowedKeys(v){switch(v){
  case'small_car':return['e','c','q','w'];
  case'big_car':return['e','c','z','x'];
  case'medium_car':return['e','c','q','w','z','x'];
  case'truck':return['t','b','n','m'];
  case'pickup_truck':return['t','b','y','u'];
  case'dump_truck':return['t','b','n','m','y','u'];
  default:return[];}}

// ── *** FIXED *** keyToDir keeps checking for left/right on cars ──────────
function keyToDir(key,v){
  // universal up/down first
  if((CAR_TYPES.includes(v)&& (key==='e'||key==='c'))||
     (TRUCK_TYPES.includes(v)&& (key==='t'||key==='b')))
    return (key==='e'||key==='t')? 'up':'down';

  switch(v){
    case'small_car':   return key==='q'?'left': key==='w'?'right':'';
    case'big_car':     return key==='z'?'left': key==='x'?'right':'';
    case'medium_car':  return ['q','z'].includes(key)?'left'
                            : ['w','x'].includes(key)?'right':'';
    case'truck':       return key==='n'?'left': key==='m'?'right':'';
    case'pickup_truck':return key==='y'?'left': key==='u'?'right':'';
    case'dump_truck':  return ['n','y'].includes(key)?'left'
                            : ['m','u'].includes(key)?'right':'';
    default:           return '';}
}

function biasVal(v,k){ if(v==='medium_car') return['q','w'].includes(k)?-1
                                              :['z','x'].includes(k)?1:0;
                       if(v==='dump_truck')  return['y','u'].includes(k)?-1
                                              :['n','m'].includes(k)?1:0;
                       return 0; }

// ─── 5. Export logic ──────────────────────────────────────────────────────
async function exportGameData(){
  const snap=await db.collectionGroup('gameSessions').get();
  if(snap.empty){console.log('No session documents found.');return;}
  const rows=[];

  snap.forEach(doc=>{
    const d=doc.data(); if(!d.gameData) return;
    const worry=score(worryItems,d.questionnaires||{});
    const somAnx=score(physItems,d.questionnaires||{});
    const trials=extractTrials(d.gameData);

    // danger calc (unchanged)
    const stats={}; trials.forEach(tr=>{
      if(tr.phase!==1) return; const v=getVehicleLabel(tr); if(!v) return;
      stats[v]=stats[v]||{n:0,obs:0}; stats[v].n+=1;
      if((tr.gridWorld||[]).some(c=>c==='obstacle')) stats[v].obs+=1;});
    let dangerousVehicle=''; if(Object.keys(stats).length){
      const r=Object.entries(stats).map(([v,o])=>[v,o.obs/o.n]).sort((a,b)=>b[1]-a[1]);
      if(r[0][1]>0.5) dangerousVehicle=r[0][0];}

    trials.sort((a,b)=>(a.phase??0)-(b.phase??0)||(a.trial??0)-(b.trial??0));

    trials.forEach(t=>{
      let planSeq='',planRT='',rawSeq='',transSeq='',validGen='',correctGen='';
      let biasValid='',biasCorrect='',typeGen='';
      // NEW vars for directional correctness split
      let corrTopDown='', corrLeftRight='';
      // NEW vars requested now
      let correctHL='', correctLL='';

      if(t.phase===2){
        if(t.inputSequence){planSeq=t.inputSequence; planRT=t.RT_P||t.totalTime||'';}
        else[planSeq,planRT]=movesToSeqAndRT(t.moves);

        const vehicle=getVehicleLabel(t);
        const keysArr=(planSeq?planSeq: (t.rawInputKeys||[]))
                        .toString().toLowerCase().split('');
        rawSeq=keysArr.join('');
        const allowed=allowedKeys(vehicle);
        const optimal=((t.optimalRoute)||[]).map(s=>(s||'').toLowerCase().trim());

        const transArr=keysArr.map(k=>keyToDir(k,vehicle));
        const valArr =keysArr.map(k=>allowed.includes(k)?1:0);
        const corArr =keysArr.map((k,i)=>allowed.includes(k)&&transArr[i]===optimal[i]?1:0);

        biasValid  =keysArr.map((k,i)=>valArr[i]?biasVal(vehicle,k):0).reduce((a,b)=>a+b,0);
        biasCorrect=keysArr.map((k,i)=>corArr[i]?biasVal(vehicle,k):0).reduce((a,b)=>a+b,0);

        transSeq   =transArr.join('');
        validGen   =valArr.reduce((a,b)=>a+b,0);
        correctGen =corArr.reduce((a,b)=>a+b,0);
        typeGen    =['medium_car','dump_truck'].includes(vehicle)?'second-order':'first-order';

        // ── Directional correctness split ──
        correctHL     = transArr.reduce((s,dir,i)=> s + (corArr[i] && (dir==='up'||dir==='down')   ? 1 : 0), 0);
        correctLL     = transArr.reduce((s,dir,i)=> s + (corArr[i] && (dir==='left'||dir==='right') ? 1 : 0), 0);

        // For backward compatibility: keep the first-order-only fields
        if(typeGen==='first-order'){
          corrTopDown   = correctHL;
          corrLeftRight = correctLL;
        }
      }

      rows.push({...flatten(t),
        sessionId:d.sessionId||doc.id, prolificId:d.prolificId||'',studyId:d.studyId||'',
        phase:t.phase,trial:t.trial,vehicleType:getVehicleLabel(t),
        vehicleSize:t.vehicleSize||'',vehicleColor:t.vehicleColor||'',
        plan_seq:planSeq,plan_rt_ms:planRT,raw_input_seq:rawSeq,
        translated_seq:transSeq,valid_generalization:validGen,
        correctness_generalization:correctGen,
        // NEW fields (all trials)
        correctHL:correctHL,
        correctLL:correctLL,
        // existing per-first-order fields
        generalized_correctness_topdown:   corrTopDown,
        generalized_correctness_leftright: corrLeftRight,
        bias_second_order_valid:biasValid,
        bias_second_order_correct:biasCorrect,type_generalization:typeGen,
        optimalRoute:JSON.stringify(t.optimalRoute || []),
        dangerous_vehicle:dangerousVehicle,worry:worry,somatic_anxiety:somAnx});
    });
  });

  if(!rows.length){console.log('No rows exported – CSV not written.');return;}

  const headers=Object.keys(rows[0]).map(id=>({id,title:id}));
  await createObjectCsvWriter({path:'game_trials_export.csv',header:headers})
        .writeRecords(rows);
  console.log(`✅ Export complete – wrote ${rows.length} rows → game_trials_export.csv`);
}

// ─── 7. Run ───────────────────────────────────────────────────────────────
exportGameData();
