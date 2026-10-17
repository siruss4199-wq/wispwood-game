// Small continuation of existing production, not a new currency or chapter.
export const KITS={
 field:{name:'Salvage kit',needs:[{family:'rig',tier:2,count:1},{family:'chart',tier:1,count:1}],kind:'salvage',reward:'Spanner + two tools'},
 survey:{name:'Survey kit',needs:[{family:'chart',tier:2,count:1},{family:'flux',tier:1,count:1}],kind:'survey',reward:'Lens + two route folds'}
};
export const ENGINE_NEEDS=[{family:'rig',tier:2,count:1},{family:'chart',tier:2,count:1},{family:'flux',tier:2,count:1}];
export function journeyState(s){
 const j=s.journey;
 s.journey={version:1,kit:KITS[j?.kit]?j.kit:j?.kit==='legacy'||!j&&s.stage>=2?'legacy':null,engine:j?.engine===true,infusions:Number.isSafeInteger(j?.infusions)&&j.infusions>=0?j.infusions:0,boost:j?.engine&&['rig','chart','flux'].includes(j?.boost?.family)&&Number.isInteger(j.boost.left)&&j.boost.left>0&&j.boost.left<=3?{...j.boost}:null};
 return s.journey;
}
