import type {Env} from '../types';
export async function sendOwnerCode(to:string,code:string,env:Env){
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${env.RESEND_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({from:env.EMAIL_FROM,to:[to],subject:'Your My Property owner code',text:`Your one-time code is ${code}. It expires in 10 minutes.`})});
 if(!response.ok)throw new Error('Email delivery failed');
}
