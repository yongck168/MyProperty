import type {Env} from '../types';
import {cookieValue,decodePayload,encodePayload,sign,validSignature} from './cookies';
import {sendOwnerCode as providerSend} from '../email/provider';
const enc=new TextEncoder();
const hex=(b:ArrayBuffer)=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function digest(value:string){return hex(await crypto.subtle.digest('SHA-256',enc.encode(value)));}
export type SendCode=(to:string,code:string,env:Env)=>Promise<void>;
export async function requestOwnerCode(email:string,env:Env,send:SendCode=providerSend,now=new Date()){
 const normalized=email.trim().toLowerCase(); if(normalized!==env.OWNER_EMAIL.trim().toLowerCase())return;
 const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);const code=String(bytes[0]%1_000_000).padStart(6,'0');
 const emailHash=await digest(normalized+env.OTP_PEPPER),codeHash=await digest(emailHash+code+env.OTP_PEPPER);
 const expires=new Date(now.getTime()+Number(env.OTP_TTL_MINUTES||10)*60000).toISOString();
 await env.DB.prepare('INSERT INTO owner_login_codes(id,email_hash,code_hash,expires_at,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),emailHash,codeHash,expires,now.toISOString()).run();
 await send(normalized,code,env);
}
export async function verifyOwnerCode(email:string,code:string,env:Env,now=new Date()){
 const normalized=email.trim().toLowerCase();if(normalized!==env.OWNER_EMAIL.trim().toLowerCase())return {ok:false as const};
 const emailHash=await digest(normalized+env.OTP_PEPPER);
 const row=await env.DB.prepare('SELECT * FROM owner_login_codes WHERE email_hash=? ORDER BY created_at DESC LIMIT 1').bind(emailHash).first<any>();
 if(!row||row.used_at||row.attempt_count>=5||Date.parse(row.expires_at)<=now.getTime())return {ok:false as const};
 const expected=await digest(emailHash+code.trim()+env.OTP_PEPPER);
 if(expected!==row.code_hash){await env.DB.prepare('UPDATE owner_login_codes SET attempt_count=attempt_count+1 WHERE id=?').bind(row.id).run();return {ok:false as const};}
 await env.DB.prepare('UPDATE owner_login_codes SET used_at=? WHERE id=?').bind(now.toISOString(),row.id).run();return {ok:true as const};
}
export async function createOwnerSession(env:Env,now=new Date()){
 const hours=Number(env.OWNER_SESSION_HOURS||12),exp=Math.floor(now.getTime()/1000)+hours*3600,payload=encodePayload({owner:true,exp,v:1});
 return `owner_session=${payload}.${await sign(payload,env.OWNER_SESSION_SECRET_CURRENT)}; Path=/owner; Max-Age=${hours*3600}; HttpOnly; Secure; SameSite=Lax`;
}
export async function verifyOwnerSession(header:string|null,env:Env,now=new Date()){
 const raw=cookieValue(header,'owner_session');if(!raw)return null;const [payload,sig]=raw.split('.');if(!payload||!sig)return null;
 const keys=[env.OWNER_SESSION_SECRET_CURRENT,env.OWNER_SESSION_SECRET_PREVIOUS].filter(Boolean) as string[];
 if(!(await Promise.all(keys.map(k=>validSignature(payload,sig,k)))).some(Boolean))return null;
 try{const c=decodePayload<{owner:boolean;exp:number;v:number}>(payload);return c.owner&&c.v===1&&c.exp>Math.floor(now.getTime()/1000)?c:null;}catch{return null;}
}
