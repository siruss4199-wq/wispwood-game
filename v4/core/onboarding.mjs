// Task 1: deterministic tutorial state, advanced by successful game events.
export const STEPS=['merge','order','producer','done'];
export const freshOnboarding=()=>({step:'merge',skipped:false});
export const completedOnboarding=()=>({step:'done',skipped:false});
export const validOnboarding=o=>!!o&&STEPS.includes(o.step)&&typeof o.skipped==='boolean';
export function nextOnboarding(current,events){
 if(!validOnboarding(current)||current.step==='done')return current;
 const expected={merge:'merged',order:'order_completed',producer:'produced'}[current.step];
 if(!events.some(e=>e.type===expected))return current;
 return {...current,step:{merge:'order',order:'producer',producer:'done'}[current.step]};
}
