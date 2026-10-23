const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});const p=await b.newPage({viewport:{width:512,height:512}});
for(const o of process.argv.slice(2)){await p.goto('file://'+path.resolve(__dirname,/^(workshop|pier|beacon|path|tent|mast|cliff|ws[a-z]+)\d$/.test(o)?'render-places.html':'render.html')+'?o='+o);await p.waitForFunction(()=>document.title!=='' ,null,{timeout:60000});const t=await p.title();if(t!=='done'){console.log(o,t);continue;}
 const data=await p.evaluate(()=>document.getElementById('c').toDataURL('image/png'));require('fs').writeFileSync(path.resolve(process.cwd(),o+'.png'),Buffer.from(data.split(',')[1],'base64'));console.log(o,'ok');}
await b.close();})();
