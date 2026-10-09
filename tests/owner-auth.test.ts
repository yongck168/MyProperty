import {describe,expect,it,vi} from 'vitest';
import {requestOwnerCode,verifyOwnerCode,createOwnerSession,verifyOwnerSession} from '../app/auth/owner-session';
import type {Env} from '../app/types';
class LoginDB{
 row:any=null;
 prepare(sql:string){return {bind:(...v:any[])=>({run:async()=>{if(sql.startsWith('INSERT'))this.row={id:v[0],email_hash:v[1],code_hash:v[2],attempt_count:0,expires_at:v[3],used_at:null};if(sql.includes('used_at='))this.row.used_at=v[0];return{success:true}},first:async()=>this.row})};}
}
const env=(db:LoginDB)=>({DB:db,OWNER_EMAIL:'owner@example.com',OWNER_SESSION_SECRET_CURRENT:'o'.repeat(32),OWNER_SESSION_HOURS:'12',OTP_PEPPER:'p'.repeat(32),OTP_TTL_MINUTES:'10',EMAIL_FROM:'My Property <a@example.com>',RESEND_API_KEY:'key'} as unknown as Env);
describe('owner auth',()=>{
 it('does not send to an unapproved email',async()=>{const send=vi.fn();await requestOwnerCode('other@example.com',env(new LoginDB()),send,new Date('2026-01-01'));expect(send).not.toHaveBeenCalled();});
 it('stores a hash and verifies a single-use code',async()=>{
  const db=new LoginDB();let delivered='';
  await requestOwnerCode('owner@example.com',env(db),async(_to,code)=>{delivered=code},new Date('2026-01-01T00:00:00Z'));
  expect(db.row.code_hash).not.toContain(delivered);
  expect((await verifyOwnerCode('owner@example.com',delivered,env(db),new Date('2026-01-01T00:05:00Z'))).ok).toBe(true);
  expect((await verifyOwnerCode('owner@example.com',delivered,env(db),new Date('2026-01-01T00:06:00Z'))).ok).toBe(false);
 });
 it('rejects expired codes',async()=>{
  const db=new LoginDB();let code='';await requestOwnerCode('owner@example.com',env(db),async(_t,c)=>{code=c},new Date('2026-01-01T00:00:00Z'));
  expect((await verifyOwnerCode('owner@example.com',code,env(db),new Date('2026-01-01T00:11:00Z'))).ok).toBe(false);
 });
 it('creates secure owner sessions',async()=>{
  const cookie=await createOwnerSession(env(new LoginDB()),new Date('2026-01-01T00:00:00Z'));
  expect(cookie).toContain('HttpOnly');expect((await verifyOwnerSession(cookie,env(new LoginDB()),new Date('2026-01-01T01:00:00Z')))?.owner).toBe(true);
 });
});
