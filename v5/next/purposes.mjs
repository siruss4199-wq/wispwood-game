// What each everyday crew order is for (Build 44, user 2026-10-25: "orderuudiig utga uchirtai
// bolgoy"). Pure text: camp jobs that need the parts, by who asks and the kind of job (quick,
// two-crew, big). Nothing here changes a rule, and nothing claims to restore a place: the gold
// order is the only one that brings a stage's materials; everyday coins go to building.
// short: on the card (≤ 22 characters); line: what the crew member says when the order is tapped.
const P=(short,line)=>({short,line});
export const PURPOSES={
 ivo:{
  quick:[P('Cart wheel came loose','The supply cart dropped a wheel on the sand. This will get it rolling again.'),P('Toolbox is short','Somebody borrowed half my toolbox. I need spares before the next shift.'),P('Tie down the crates','Wind is picking up. These will keep the crates from walking off.'),P('Fix the water pump','The camp pump is coughing again. One good part and it runs.')],
  pair:[P('Mend the hand cart','Two kinds of parts for the hand cart: one for the axle, one for the frame.'),P('Rig a sand sled','A sled to drag stone off the path. Needs a bit of everything.')],
  big:[P('Rebuild the crane arm','The old crane arm is bent double. A proper part and it lifts again.'),P('Haul the fallen beam','A beam the storm dropped is blocking the shore. This is a big job.'),P('Rig a pulley for the dig','We are digging deeper. A pulley will save everyone\'s backs.')]
 },
 neri:{
  quick:[P('Mark the tide line','I mark the tide every morning. This keeps the chart honest.'),P('Trade with the divers','The shell divers trade for these. Their maps are worth it.'),P('Sketch the north cove','One more piece and I can finish the north cove.')],
  pair:[P('Kit for a survey walk','A walk along the reach needs gear from two crews.'),P('Mark a safe channel','Buoys and bearings for the channel the boats use.')],
  big:[P('Chart the reef channel','The reef channel is half a guess. With this I can chart it properly.'),P('Map the cliff caves','The caves under the cliff go further than we thought.'),P('Survey the sandbar','The sandbar moved in the storm. Time to measure it again.')]
 },
 tamsin:{
  quick:[P('Night watch needs light','The night watch sits in the dark. A little light helps.'),P('Signal the supply boat','The supply boat waits for our signal. This sends it.'),P('Trim the lamp wicks','Every lamp in camp needs trimming before dusk.')],
  pair:[P('Lights for the dock','Lights and fittings for the dock, so boats can land at night.'),P('Repair the signal rig','Half lamp, half rigging: the signal rig took a beating.')],
  big:[P('Rekindle the old signal','There is an old signal on the point. With this it could burn again.'),P('Light the reef markers','Markers on the reef, so nobody runs aground.'),P('Test a long-range lamp','I want to see how far a lamp can reach from here.')]
 },
 bram:{
  quick:[P('Stock the camp store','The camp store runs low. Anything helps.')],
  pair:[P('Kit out a scouting party','A scouting party leaves at dawn. They need gear from two crews.'),P('Pack for the cliff climb','The climbers need both kinds before they go up.'),P('Supplies for two crews','Two crews, one delivery. Keep them both working.'),P('Fit out the night camp','The night camp needs tools and light.')],
  big:[P('A crate for the far camp','A big crate for the camp down the reach. They will pay well.')]
 }
};
// The order number is part of the order's id ('o42'), so the text stays the same after a reload.
export function purposeOf(o,role){
 const list=PURPOSES[o.who]?.[role]??PURPOSES[o.who]?.quick;if(!list?.length)return null;
 const n=+String(o.id).replace(/\D/g,'')||0;return list[n%list.length];
}
