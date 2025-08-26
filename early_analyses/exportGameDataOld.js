// =============================================================
//  exportGameData.js   – 2025-07-08  (rev-J: start-time cutoff)
//  • NEW constant START_TIME_CUTOFF_MS  (08-Jul-2025 00:00 UTC)
//  • Sessions whose startTime < cutoff are skipped entirely.
// =============================================================

// ─── 0. Deps ──────────────────────────────────────────────────
const admin                     = require('firebase-admin');
const { createObjectCsvWriter } = require('csv-writer');

// ─── 0-bis. Global cutoff (inclusive of 8 July 2025) ─────────
const START_TIME_CUTOFF_MS = new Date('2025-07-08T00:00:00Z').getTime(); // 1 751 932 800 000

// ─── 1. Firebase Admin init ──────────────────────────────────
const serviceAccount = require('../../firebase_key/serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ─── 2. Questionnaire keys ───────────────────────────────────
const worryItems = Array.from({ length: 8  }, (_, i) => `worry${i + 1}`);
const physItems  = Array.from({ length: 10 }, (_, i) => `phys${i + 1}`);

// ─── 3. Generic helpers ──────────────────────────────────────
const score   = (keys, src) => keys.reduce((s, k) => s + (Number(src[k]) || 0), 0);
const flatten = (obj, prefix='') => Object.entries(obj||{}).reduce((acc,[k,v])=>{
  const key = prefix ? `${prefix}_${k}` : k;
  acc[key] = v==null ? '' : typeof v==='object' ? JSON.stringify(v) : v;
  return acc;
}, {});

// ─── extractTrials, movesToSeqAndRT (unchanged) ──────────────
function extractTrials(g){ if(!g) return []; if(Array.isArray(g.trials)) return g.trials;
  const map={practice:0,phase1:1,phase2:2},out=[]; for(const[p,a]of Object.entries(g)){
    if(Array.isArray(a)){const id=map[p]??p; a.forEach(t=>out.push({phase:id,...t}))}}
  return out}
function movesToSeqAndRT(m){ if(!Array.isArray(m)||!m.length) return['',''];
  return [m.map(r=>r.keyPressed||'').join(''), m[m.length-1].time];}

// ─── 4. Vehicle helpers ──────────────────────────────────────
const CAR_TYPES   = ['small_car','big_car','medium_car'];
const SEDAN_TYPES = ['medium_trick','medium_pickup','medium_sedan'];
function getVehicleLabel(t){
  const base=(t.vehicleType||'').toLowerCase();
  if(base==='car'){const s=(t.vehicleSize||'').toLowerCase();
    if(['small','big','medium'].includes(s)) return `${s}_car`;}
  if(base==='truck'){const s=(t.vehicleSize||'').toLowerCase();
    if(['small','big','medium'].includes(s)) return `${s}_sedan`;}
  return base;}

function allowedKeys(v){switch(v){
  case'small_car':return['e','c','a','d'];
  case'big_car':return['e','c','s','f'];
  case'medium_car':return['w','x','a','d','e','c','s','f'];
  case'small_sedan':return['y','n','g','j'];
  case'big_sedan':return['u','m','h','k'];
  case'medium_sedan':return['y','n','g','j','u','m','h','k'];
  default:return[];}}

// ── keyToDir keeps checking for left/right on cars ───────────
function keyToDir(key,v){
  switch(v){
    case'small_car':   return key==='a'?'left': key==='d'?'right':key==='w'?'up':key==='x'?'down':'';
    case'big_car':     return key==='s'?'left': key==='f'?'right':key==='e'?'up':key==='c'?'down':'';
    case'medium_car':  return ['a','s'].includes(key)?'left'
                            : ['d','f'].includes(key)?'right'
                            : ['w','e'].includes(key)?'up'
                            : ['x','c'].includes(key)?'down':'';
    case'small_sedan': return key==='g'?'left': key==='j'?'right':key==='y'?'up':key==='n'?'down':'';
    case'big_sedan':   return key==='h'?'left': key==='k'?'right':key==='u'?'up':key==='m'?'down':'';
    case'medium_sedan':return ['g','h'].includes(key)?'left'
                            : ['j','k'].includes(key)?'right'
                            : ['y','u'].includes(key)?'up'
                            : ['n','m'].includes(key)?'down':'';
    default:           return '';}
}

function biasVal(v,k){ if(v==='medium_car')    return['a','d'].includes(k)?-1
                                                :['s','f'].includes(k)?1:0;
                       if(v==='medium_sedan')  return['g','j'].includes(k)?-1
                                                :['h','k'].includes(k)?1:0;
                       return 0; }

// ─── 5. Export logic ─────────────────────────────────────────
async function exportGameData(){
  const snap = await db.collectionGroup('gameSessions').get();
  if(snap.empty){console.log('No session documents found.');return;}
  const rows=[];

  snap.forEach(doc=>{
    const d = doc.data(); if(!d.gameData) return;

    // ── NEW: session cutoff ──────────────────────────────────
    const sessionStart = Number(d.startTime || d.gameData?.startTime || 0);
    if(sessionStart && sessionStart < START_TIME_CUTOFF_MS) return; // skip early sessions
    // ─────────────────────────────────────────────────────────

    const worry   = score(worryItems,d.questionnaires||{});
    const somAnx  = score(physItems,d.questionnaires||{});
    const trials  = extractTrials(d.gameData);

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
      let corrTopDown='',corrLeftRight='';
      let correctHL='',correctLL='';

      if(t.phase===2){
        if(t.inputSequence){planSeq=t.inputSequence; planRT=t.RT_P||t.totalTime||'';}
        else[planSeq,planRT]=movesToSeqAndRT(t.moves);

        const vehicle=getVehicleLabel(t);
        const keysArr=(planSeq?planSeq:(t.rawInputKeys||[]))
                       .toString().toLowerCase().split('');
        rawSeq=keysArr.join('');
        const allowed=allowedKeys(vehicle);
        const optimal=((t.optimalRoute)||[]).map(s=>(s||'').toLowerCase().trim());

        const transArr=keysArr.map(k=>keyToDir(k,vehicle));
        const valArr =keysArr.map(k=>allowed.includes(k)?1:0);
        const corArr =keysArr.map((k,i)=>allowed.includes(k)&&transArr[i]===optimal[i]?1:0);

        biasValid   =keysArr.map((k,i)=>valArr[i]?biasVal(vehicle,k):0).reduce((a,b)=>a+b,0);
        biasCorrect =keysArr.map((k,i)=>corArr[i]?biasVal(vehicle,k):0).reduce((a,b)=>a+b,0);

        transSeq    =transArr.join('');
        validGen    =valArr.reduce((a,b)=>a+b,0);
        correctGen  =corArr.reduce((a,b)=>a+b,0);
        typeGen     =['medium_car','medium_sedan'].includes(vehicle)?'second-order':'first-order';

        correctHL   = transArr.reduce((s,dir,i)=> s + (corArr[i] && (dir==='up'||dir==='down')   ? 1 : 0), 0);
        correctLL   = transArr.reduce((s,dir,i)=> s + (corArr[i] && (dir==='left'||dir==='right') ? 1 : 0), 0);

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
        correctHL, correctLL,
        generalized_correctness_topdown:corrTopDown,
        generalized_correctness_leftright:corrLeftRight,
        bias_second_order_valid:biasValid,
        bias_second_order_correct:biasCorrect,
        type_generalization:typeGen,
        optimalRoute:JSON.stringify(t.optimalRoute||[]),
        dangerous_vehicle:dangerousVehicle,
        worry:worry, somatic_anxiety:somAnx});
    });
  });

  if(!rows.length){console.log('No rows exported – CSV not written.');return;}

  const headers = Object.keys(rows[0]).map(id=>({id,title:id}));
  await createObjectCsvWriter({path:'game_trials_export.csv',header:headers})
        .writeRecords(rows);
  console.log(`✅ Export complete – wrote ${rows.length} rows → game_trials_export.csv`);
}

// ─── 7. Run ──────────────────────────────────────────────────
exportGameData();
