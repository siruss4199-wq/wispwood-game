// The earned Ocean Crown gets a clear primary narrative action. Viewing the
// signal opens a question, not a finale: play continues at the camp. Presentation-only.
export function chapterEndView(s){
 if(s.stage!==4||!s.discovered?.includes('chart:tide:4'))return null;
 if(s.camp?.fleetViewed!==true)return {
  status:'pending',title:'The Ocean Crown is a signal',phase:'STORY DISCOVERY',
  detail:'Neri and Ivo have found the missing fleet’s message. Reveal what it says.',
  hint:'DISCOVERY READY · reveal the fleet signal above',
  action:'REVEAL SIGNAL'
 };
 return {
  status:'complete',title:'Someone answered the fleet signal',phase:'THE SIGNAL ANSWERS',
  detail:'You traced the missing fleet, and something beyond the horizon answered. Keep the camp working.',
  hint:'THE SIGNAL ANSWERS · the camp keeps working below',
  action:'REVISIT STORY'
 };
}
