// Vaultwake's story spine is derived entirely from earned progress.
// No quest currencies, save migrations or forced dialogue interruptions.
const beat=(title,voice,line,question)=>({title,voice,line,question});

export function storySnapshot(s){
 const expedition=s.stage>=4
  ?beat('The sky beneath the sea','Neri · navigator',
    'The Vault is not a treasure room. Its moving stars chart a shoreline that has not appeared yet.',
    'Who could have charted tomorrow\'s coast?')
  :s.stage>=3
  ?beat('The sealed door','Ivo · quartermaster',
    'These locks are newer than the ruins. Someone came back to hide what was found.',
    'Who closed the Tideglass Vault from outside?')
  :s.stage>=2
  ?beat('The silent ring engines','Neri · navigator',
    'The buried instruments follow the tides, not the constellations. The rings may reveal their destination.',
    'Where did the missing survey lead?')
  :s.stage>=1
  ?beat('Abandoned in a hurry','Ivo · quartermaster',
    'The expedition machines were abandoned in the middle of a measurement. Nobody stopped to pack them.',
    'What forced the first survey crew to leave?')
  :s.landingStep>=1
  ?beat('The impossible map','Neri · navigator',
    'Two coastal charts show different shorelines for the same day. Neither can be dismissed.',
    'Why does the coast seem to move?')
  :beat('The false tide','Neri · navigator',
    'The Saltglass tides no longer agree with any chart. Our missing survey crew followed them to this shore.',
    'Find the buried crossing and learn what drew the crew here.');

 const discovered=s.discovered??[];
 const tide=tier=>discovered.includes('chart:tide:'+tier);
 const camp=tide(4)
  ?beat('Signal of the lost fleet','Ivo · quartermaster',
    'The Ocean Crown was not a royal prize. It was a signal for the vanished fleet to return.',
    'Who was supposed to answer the signal? The next coast remains uncharted.')
  :tide(3)
  ?beat('A lighthouse without a shore','Neri · navigator',
    'The Celestial Sextant fixes a lighthouse on a coastline no modern map contains.',
    'Merge toward the Ocean Crown to understand the missing fleet.')
  :s.camp?.deepSurvey
  ?beat('Follow the lost passage','Neri · navigator',
    'Deep Survey follows the vanished expedition beyond our old maps. The instruments can now locate rarer finds.',
    'Recover and merge to reveal the Celestial Sextant.')
  :tide(2)
  ?beat('The fleet that vanished','Ivo · quartermaster',
    'The Pearl Astrolabe bears the emblem of a fleet erased from every shipping register.',
    'Rebuild Deep Survey to learn where the fleet went.')
  :s.camp?.loft
  ?beat('The charting station','Neri · navigator',
    'The Reef Compass points offshore, but the old maps put its destination far inland.',
    'Recover matching Tide Treasures to assemble a Pearl Astrolabe.')
  :s.camp?.pier
  ?beat('The missing harbor','Neri · navigator',
    'The Supply Pier lines up with an erased point on the old chart. A proper loft could reveal its bearing.',
    'Establish the Charting Loft to recover navigation treasures.')
  :s.workshop?.repaired
  ?beat('The recovered instrument','Ivo · quartermaster',
    'The restored Workshop carries the same socket as the broken Tide Dial. The old crew worked with these relics.',
    'Build the Supply Pier to pursue the missing navigation set.')
  :(s.camp?.earlyFragments??0)>0||tide(0)||tide(1)
  ?beat('A fragment of the missing chart','Neri · navigator',
    'The Tide Dial fragment points toward a coast erased from the survey records.',
    'Merge matching fragments to form the first Reef Compass.')
  :beat('An abandoned camp','Ivo · quartermaster',
    'Our camp is damaged, but the old Workshop can be saved. The first deliveries will fund the repairs.',
    'Complete orders, earn supplies and restore the Workshop.');

 return {expedition,camp};
}

 
import {campGoal} from './camp-goals.mjs';
// Existing requests gain character motivation without changing rewards,
// generation, pending orders or save data. Display only on selection.
export function requestBrief(order,s){
 const needs=order?.needs??[];
 const first=needs[0]?.family;
 const brief=needs.some(x=>x.line==='tide')
  ?{title:'Neri · missing-coast survey',reason:'Neri needs these Tide Treasures to trace the erased shoreline.'}
  :first==='rig'
  ?{title:'Ivo · camp repairs',reason:'Ivo needs working tools to keep the coastal expedition running.'}
  :first==='chart'
  ?{title:'Neri · navigation charts',reason:'Neri needs survey instruments to follow the shifting tide.'}
  :{title:'Ivo · relic power',reason:'Ivo needs charged parts to keep the ancient machinery awake.'};
 if(!s)return brief;
 const project=campGoal(s);
 if(project?.cost&&project.kind==='camp'){
  const have=s.requests?.supplies??0;
  const next=Math.min(project.cost,have+(order?.supplies??0));
  return {...brief,reason:(have>=project.cost
   ?project.name+' is ready to build. '
   :'This order funds '+project.name+': '+have+' → '+next+'/'+project.cost+' supplies. ')+brief.reason};
 }
 return {...brief,reason:brief.reason+' Supplies can be spent on useful Supply Pier cases.'};
}
