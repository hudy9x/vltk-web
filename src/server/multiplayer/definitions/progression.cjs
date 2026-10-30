// Intents only. Reuse native learning/route rules; never accept client-computed profiles.
const native=require('./runtime.cjs');
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
exports.apply=function(input,action,development=false){
  if(!action||typeof action!=='object'||Array.isArray(action))fail('Thao tác không hợp lệ.');
  return native.withProgression(input,s=>{
    const p=s.o,kind=action.kind,integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
    const skill=()=>{const row=s.T[action.skill];if(!row||!s.I[p.fac]?.skills.includes(row.id))fail('Chiêu không thuộc môn phái.');return row;};
    switch(kind){
      case 'mainSkill':{
        if(action.skill===null){p.mainLock=false;break;}
        if(action.skill!=='basic'&&(!integer(action.skill,1,65535)||!s.canSlotSkill(action.skill)||!s.UA(s.T[action.skill])))fail('Chiêu chính phải là chiêu tấn công đã học.');
        p.main=action.skill;p.mainLock=true;break;
      }
      case 'secondarySkill':{
        if(action.skill!==null&&(!integer(action.skill,1,65535)||!s.canSlotSkill(action.skill)))fail('Chiêu phụ phải là chiêu đã học có thể sử dụng.');
        p.secondarySkill=action.skill??0;break;
      }
      case 'skillSlot':{
        if(!integer(action.index,0,3)||(action.skill!==-1&&(!integer(action.skill,1,65535)||!s.canSlotSkill(action.skill))))fail('Ô kỹ năng không hợp lệ.');
        const slots=[0,1,2,3].map(i=>p.slots?.[i]??-1),previous=slots.indexOf(action.skill);
        if(action.skill!==-1&&previous>=0)slots[previous]=slots[action.index];
        slots[action.index]=action.skill;p.slots=slots;break;
      }
      case 'potionBuy':{
        const potion=s.S.potions.find(row=>row.kind===action.potion&&row.tier===action.tier);
        if(!potion||!s.ro(potion))fail('Chưa đủ cấp dùng loại thuốc này.');
        const price=s.Ot(potion);
        if(!Number.isSafeInteger(price)||price<=0||!(p.gold>=price))fail('Không đủ ngân lượng mua thuốc.');
        const stock=s.C1(potion.kind),count=stock[potion.tier]||0;
        if(!integer(count,0,999999))fail('Túi thuốc đã đầy.');
        stock[potion.tier]=count+1;p.gold-=price;break;
      }
      case 'potential':{
        if(!['str','dex','vit','eng'].includes(action.key)||!integer(action.amount,-1000000,1000000)||!action.amount)fail('Điểm tiềm năng không hợp lệ.');
        if(action.amount>p.attrPts||-action.amount>(p.attr[action.key]||0))fail('Không đủ điểm tiềm năng.');
        p.attr[action.key]=(p.attr[action.key]||0)+action.amount;p.attrPts-=action.amount;break;
      }
      case 'skill':{
        const row=skill();if(!integer(action.amount??1,1,100))fail('Số điểm kỹ năng không hợp lệ.');
        for(let i=0;i<(action.amount??1);i++)if(!s.Yi(row.id))fail('Không đủ cấp, điểm kỹ năng hoặc bí kíp.');break;
      }
      case 'skillMax':{
        const row=skill();let count=0;
        for(let i=0;i<row.max;i++){if(!s.Yi(row.id))break;count++;}
        if(!count)fail('Không đủ cấp, điểm kỹ năng hoặc bí kíp.');break;
      }
      case 'unlearnAll':{
        const row=skill();let count=0;
        for(let i=0;i<row.max;i++){if(!s.qf(row.id))break;count++;}
        if(!count)fail('Chiêu chưa được học.');break;
      }
      case 'unlearn':skill();if(!s.qf(action.skill))fail('Chiêu chưa được học.');break;
      case 'join':{
        const f=s.I[action.faction];
        if(!f||f.novice||!s.ht()||p.lvl<s.KA||f.series!==s.F0()||!s.hn(f,p.sex))fail('Chưa đủ điều kiện gia nhập môn phái.');
        s.$v(action.faction);break;
      }
      case 'changeFaction':{
        const f=s.I[action.faction];if(!f||f.novice||f.key===p.fac||!s.hn(f,p.sex)||s.N('misc','ldp')<1)fail('Không đủ điều kiện đổi phái.');
        s.N7(action.faction);break;
      }
      case 'potentialRoute':if(!s.getSkillRoutes().some(r=>r.id===action.route))fail('Tuyến tiềm năng không hợp lệ.');s.applyPotentialRoute(action.route);break;
      case 'skillRoute':if(!s.getSkillRoutes().some(r=>r.id===action.route))fail('Tuyến kỹ năng không hợp lệ.');s.applySkillRoute(action.route);break;
      case 'bestPotential':s.Dg();break;
      case 'equipmentPotential':s.j5();break;
      case 'autoPotential':s.yt();break;
      case 'autoSkill':s.Pt();break;
      case 'reset':if(typeof action.attributes!=='boolean'||typeof action.skills!=='boolean')fail('Lệnh tẩy tủy không hợp lệ.');s.p4(action.attributes,action.skills);break;
      case 'gm':{
        if(!development)throw Object.assign(new Error('GM chỉ dùng trong development.'),{status:403});
        const name=action.action;
        if(name==='level150'){
          const levels=Math.max(0,150-p.lvl);p.lvl+=levels;p.xp=levels?0:p.xp;p.attrPts+=levels*s.z2;p.skPts+=levels*s.x5;
        }else if(name==='xp')exports.addExperience(p,100000000,s.S.exp);
        else if(name==='potential')p.attrPts+=3000;
        else if(['learn90','learn120','learn150','max90'].includes(name)){
          const max=name==='max90',tier=Number(name.slice(5));
          const rows=s.I[p.fac]?.skills.map(id=>s.T[id]).filter(row=>row&&(max?[90,150].includes(row.tier)&&(p.sk[row.id]||0)>0:row.tier===tier));
          if(s.I[p.fac]?.novice||!rows?.length||rows.some(row=>!s.W2(row)))fail('Chưa đủ cấp hoặc chưa gia nhập môn phái.');
          p.bkOk||={};p.skL||={};
          for(const row of rows){const level=max?row.max:Math.max(1,p.sk[row.id]||0,p.skL[row.id]?.lv||0);p.sk[row.id]=level;p.bkOk[row.id]=1;p.skL[row.id]={lv:level,xp:max?0:p.skL[row.id]?.xp||0};}
          p.sk150Training=1;
        }else if(name==='gold')p.gold=(p.gold||0)+1000000000000;
        else if(name==='knb')p.knb=(p.knb||0)+100000;
        else if(name==='warMerit'){p.mats||={};p.mats.misc||={};p.mats.misc.tk_merit=(p.mats.misc.tk_merit||0)+10000;}
        else if(name==='chest'){
          const key='gm_hk_'+p.fac;
          if(!s.J0.some(row=>row.k===key))s.J0.push({k:key,n:'Rương Hoàng Kim môn phái · '+s.I[p.fac].n,ic:'img/ep/box2.png',hide:1});
          if(!s.B4(key,100))fail('Hành trang không đủ chỗ.');
        }else fail('Lệnh GM không hợp lệ.');
        break;
      }
      default:if(!require('./equipment.cjs').apply(s,action))fail('Thao tác tiến triển không hợp lệ.');
    }
    if(!Number.isFinite(p.xp)||p.xp<0||p.xp>Number.MAX_SAFE_INTEGER)fail('EXP không hợp lệ.');
    for(const key of ['lvl','attrPts','skPts','gold','knb'])if(!Number.isSafeInteger(p[key]||0)||(p[key]||0)<0)fail('Chỉ số vượt giới hạn lưu trữ.');
    return structuredClone(p);
  });
};
exports.addExperience=function(p,amount,curve=native.catalog().exp){
  p.xp=(p.xp||0)+amount;
  while(p.lvl<200&&Number(curve[p.lvl-1])>0&&p.xp>=Number(curve[p.lvl-1])){
    p.xp-=Number(curve[p.lvl-1]);p.lvl++;p.attrPts=(p.attrPts||0)+5;p.skPts=(p.skPts||0)+1;
  }
};
