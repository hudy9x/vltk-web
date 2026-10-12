const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
const ROOT = path.resolve(__dirname,'..');
const APP = path.join(ROOT,'app');
let previousHash;
function vlq(value) {
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let number=value < 0 ? (-value << 1)|1 : value << 1, output='';
  do { let digit=number & 31;number >>>= 5;if(number)digit|=32;output+=alphabet[digit]; } while(number);
  return output;
}
function assemble() {
  const manifest=JSON.parse(fs.readFileSync(path.join(APP,'modules.json'),'utf8'));
  const modules=manifest.modules.map(({file})=>{
    if(!/^(?:[a-z0-9-]+\/)*[a-z0-9-]+\.js$/.test(file) || file==='game.js')throw new Error('Invalid module path: '+file);
    return {file,source:fs.readFileSync(path.join(APP,file),'utf8')};
  });
  const hash=createHash('sha256').update(JSON.stringify(modules)).digest('hex');
  let code='// Generated from app/modules.json. Edit the source modules, then rebuild.\n(function () {\n';
  const mappings=['',''];let sourceIndex=0,sourceLine=0;
  modules.forEach((module,index)=>{
    code+=`// Source: ${module.file}\n`;mappings.push('');
    const lines=module.source.replace(/\n$/,'').split('\n');
    lines.forEach((line,number)=>{
      code+=line+'\n';
      mappings.push([0,index-sourceIndex,number-sourceLine,0].map(vlq).join(''));
      sourceIndex=index;sourceLine=number;
    });
  });
  code+='})();\n//# sourceMappingURL=game.js.map\n';
  mappings.push('','');
  new vm.Script(code,{filename:'app/game.js'});
  const map={version:3,file:'game.js',sources:modules.map(m=>m.file),sourcesContent:modules.map(m=>m.source),names:[],mappings:mappings.join(';')};
  return { code,map,hash,modules };
}
function buildApp() {
  const result=assemble();
  if(previousHash===result.hash && fs.existsSync(path.join(APP,'game.js')) && fs.existsSync(path.join(APP,'game.js.map')))return result;
  fs.writeFileSync(path.join(APP,'game.js'),result.code);
  fs.writeFileSync(path.join(APP,'game.js.map'),JSON.stringify(result.map));
  previousHash=result.hash;
  return result;
}
if(require.main===module){const result=buildApp();console.log(`Built app/game.js from ${result.modules.length} modules (${Buffer.byteLength(result.code)} bytes).`);}
module.exports={ assemble,buildApp };
