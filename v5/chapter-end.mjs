// The earned Ocean Crown gets a clear primary narrative action. Viewing the
// signal completes Chapter 1; future orders remain optional. Presentation-only.
export function chapterEndView(s){
 if(s.stage!==4||!s.discovered?.includes('chart:tide:4'))return null;
 if(s.camp?.fleetViewed!==true)return {
  status:'pending',title:'The Ocean Crown is a signal',phase:'STORY DISCOVERY',
  detail:'Neri and Ivo have found the missing fleet’s message. Reveal it to finish Chapter 1.',
  hint:'DISCOVERY READY · reveal the fleet signal above',
  action:'REVEAL SIGNAL'
 };
 return {
  status:'complete',title:'The fleet left a signal',phase:'CHAPTER 1 COMPLETE',
  detail:'You traced the missing fleet. Its signal still answers from the horizon.',
  hint:'CHAPTER 1 COMPLETE · optional camp orders are below',
  action:'REVISIT STORY'
 };
}
