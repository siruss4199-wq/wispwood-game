import assert from 'node:assert/strict';
import {routePrepared} from '../v5/navigation.mjs';
// Prepared tools may sit anywhere. No fixture rearrangement hides a requirement.
export function prepareRoute(s,id){assert.ok(routePrepared(s,id));}
