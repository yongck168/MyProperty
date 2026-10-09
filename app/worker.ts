import type { Env } from './types';
import {handlePublicRequest} from './routes/public';
import {handleOwnerRequest} from './routes/owner';
import {isSameOriginMutation,withSecurityHeaders} from './security';

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const requestId=crypto.randomUUID(), path=new URL(request.url).pathname;
    try{
      if(!isSameOriginMutation(request,env.SITE_ORIGIN||new URL(request.url).origin))return withSecurityHeaders(new Response('Forbidden',{status:403}),requestId);
      const response=path.startsWith('/owner')
        ? await handleOwnerRequest(request,env)
        : (path==='/'||path==='/index.html'||path==='/access')
        ? await handlePublicRequest(request,env,requestId)
        : new Response('Not found',{status:404});
      return withSecurityHeaders(response,requestId);
    }catch{return withSecurityHeaders(new Response(`Unexpected error. Request ID: ${requestId}`,{status:500}),requestId);}
  },
};
