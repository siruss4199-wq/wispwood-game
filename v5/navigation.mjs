// Route preparation is normal merging. Board placement never gates navigation.
// Mid-survey saves keep their lens, stock and coordinates exactly as they were.
export function routePrepared(s,id){
 return s.stage===1&&s.routePrepared===true&&['ridge','conduit'].includes(id);
}
