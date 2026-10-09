const enc=new TextEncoder();
const b64=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64=(value:string)=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export async function sign(value:string,secret:string){
 const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return b64(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(value))));
}
export async function validSignature(value:string,signature:string,secret:string){
 const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 try{return await crypto.subtle.verify('HMAC',key,unb64(signature),enc.encode(value));}catch{return false;}
}
export function cookieValue(header:string|null,name:string){
 const match=header?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`)); return match?.[1]??null;
}
export const encodePayload=(value:unknown)=>b64(enc.encode(JSON.stringify(value)));
export const decodePayload=<T>(value:string):T=>JSON.parse(new TextDecoder().decode(unb64(value))) as T;
