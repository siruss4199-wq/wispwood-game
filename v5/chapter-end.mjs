// A completed mystery is a real end, not an endless mandatory order.
 // Presentation only: no new save fields, item grants, or gameplay gates.
export function chapterEndView(s){
 if(s.stage!==4||s.camp?.fleetViewed!==true)return null;
 return {
  title:'The fleet left a signal',
  phase:'CHAPTER 1 COMPLETE',
  detail:'You traced the missing fleet. Its signal still answers from the horizon.',
  hint:'CHAPTER 1 COMPLETE · optional camp orders are below',
  action:'REVISIT STORY'
 };
}
