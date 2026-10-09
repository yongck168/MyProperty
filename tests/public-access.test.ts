import {describe,expect,it} from 'vitest';
import {renderAccessGate,renderProtectedShell} from '../app/templates/public';
import {registerLead} from '../app/domain/leads';
import type {Env} from '../app/types';
import worker from '../app/worker';

class FakeDB {
  rows:any[]=[]; fail=false; existing:any=null;
  prepare(sql:string){return {bind:(...values:any[])=>({first:async()=>sql.startsWith('SELECT id FROM leads')?this.existing:null,run:async()=>({success:true}),sql,values})};}
  async batch(statements:any[]){if(this.fail)throw new Error('db');this.rows.push(...statements);return statements.map(()=>({success:true}));}
}
const baseEnv=(db:FakeDB)=>({DB:db,CONSENT_TEXT_VERSION:'2026-10-09-v1',PRIVACY_POLICY_VERSION:'2026-10-09-v1'} as unknown as Env);

describe('public access',()=>{
 it('worker gates direct listing routes',async()=>{
   const env={...baseEnv(new FakeDB()),VISITOR_SESSION_SECRET_CURRENT:'a'.repeat(32),VISITOR_SESSION_DAYS:'180'} as Env;
   const response=await worker.fetch(new Request('https://example.com/index.html'),env,{} as ExecutionContext);
   expect(response.status).toBe(200); expect(await response.text()).not.toContain('Sunway Belfield');
 });
 it('gate excludes protected listing content',()=>{
   const html=renderAccessGate();
   expect(html).toContain('Your name'); expect(html).toContain('consent');
   expect(html).not.toContain('Sunway Belfield'); expect(html).not.toContain('propertyguru.com.my/property-listing');
 });
 it('protected shell preserves brand and links',()=>{
   const html=renderProtectedShell('<section>Existing listings</section>');
   expect(html).toContain('Calvin Yong'); expect(html).toContain('60183138136'); expect(html).toContain('Existing listings');
 });
 it('requires valid mobile and explicit consent',async()=>{
   const db=new FakeDB();
   await expect(registerLead({name:'CK',mobile:'03-12345678',consent:true},{path:'/',requestId:'r1'},baseEnv(db))).rejects.toThrow('mobile');
   await expect(registerLead({name:'CK',mobile:'0183138136',consent:false},{path:'/',requestId:'r1'},baseEnv(db))).rejects.toThrow('consent');
   expect(db.rows).toHaveLength(0);
 });
 it('persists lead consent and visit before success',async()=>{
   const db=new FakeDB();
   const result=await registerLead({name:'Calvin Yong',mobile:'018-313 8136',consent:true},{path:'/',requestId:'r1'},baseEnv(db));
   expect(result.mobileE164).toBe('+60183138136'); expect(db.rows).toHaveLength(3);
 });
 it('reuses the existing lead id for a duplicate mobile',async()=>{
   const db=new FakeDB();db.existing={id:'existing-lead'};
   const result=await registerLead({name:'Calvin',mobile:'0183138136',consent:true},{path:'/',requestId:'r2'},baseEnv(db));
   expect(result.leadId).toBe('existing-lead');
   expect(db.rows[1].values[1]).toBe('existing-lead');
 });
 it('does not succeed when persistence fails',async()=>{
   const db=new FakeDB();db.fail=true;
   await expect(registerLead({name:'CK',mobile:'0183138136',consent:true},{path:'/',requestId:'r1'},baseEnv(db))).rejects.toThrow('db');
 });
});
