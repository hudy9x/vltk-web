// Evaluate the actual native resistance function, rather than a copy of it.
const fs=require('node:fs'),vm=require('node:vm'),{parse}=require('acorn');
const native=require('../../src/server/multiplayer/definitions/runtime.cjs');
const scope=vm.createContext({Math,cw:native.damageRules().maximumResistance});
for(const [file,names]of [['src/client/core/helpers-and-config-01.js',['E','Wt','y1']],['src/client/core/state-and-save-01.js',['ja']]]){
 const source=fs.readFileSync(file,'utf8');
 for(const statement of parse(source,{ecmaVersion:'latest'}).body)
  if(statement.type==='VariableDeclaration')for(const item of statement.declarations)
   if(names.includes(item.id.name))vm.runInContext('var '+source.slice(item.start,item.end),scope);
}
module.exports=function reference(c){
 const s=c.skill,p=s.pve,keys=['phys','poison','cold','fire','light'];
 const res=Object.fromEntries(keys.map((k,i)=>[k,c.resistance[i]-p.anti[i]]));
 const parts=s.parts.map((v,i)=>scope.ja(v*c.rolls[i],keys[i],p.series,c.targetSeries,res,p.resistanceCap,p.seriesResistance));
 if(c.critical)parts[0]*=p.criticalMultiplier;
 let direct=parts[0]+parts[2]+parts[3]+parts[4];
 if(scope.y1(p.series,c.targetSeries))direct+=p.flatSeries;
 if(c.fatal)direct*=1.5;
 if(scope.y1(p.series,c.targetSeries))direct*=1+p.advantageBonus;
 else if(scope.y1(c.targetSeries,p.series))direct*=1-p.advantageBonus;
 direct*=1+(p.versus[c.targetSeries]||0)/100;
 return {parts,direct};
};
