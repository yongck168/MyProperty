import type {Env} from '../types';
import {cookieValue,decodePayload,encodePayload,sign,validSignature} from './cookies';
export interface VisitorClaims{leadId:string;exp:number;v:1}
export async function createVisitorSession(leadId:string,env:Env,now=new Date()){
 const days=Number(env.VISITOR_SESSION_DAYS||180); const exp=Math.floor(now.getTime()/1000)+days*86400;
 const payload=encodePayload({leadId,exp,v:1}); const signature=await sign(payload,env.VISITOR_SESSION_SECRET_CURRENT);
 return `visitor_access=${payload}.${signature}; Path=/; Max-Age=${days*86400}; HttpOnly; Secure; SameSite=Lax`;
}
export async function verifyVisitorSession(header:string|null,env:Env,now=new Date()):Promise<VisitorClaims|null>{
 const raw=cookieValue(header,'visitor_access'); if(!raw)return null;
 const [payload,sig]=raw.split('.'); if(!payload||!sig)return null;
 const keys=[env.VISITOR_SESSION_SECRET_CURRENT,env.VISITOR_SESSION_SECRET_PREVIOUS].filter(Boolean) as string[];
 if(!(await Promise.all(keys.map(k=>validSignature(payload,sig,k)))).some(Boolean))return null;
 try{const claims=decodePayload<VisitorClaims>(payload); return claims.v===1&&claims.exp>Math.floor(now.getTime()/1000)?claims:null;}catch{return null;}
}
