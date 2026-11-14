// Local-only AI fixture. No upstream requests, keys or real user data.
import http from 'node:http';
if(process.env.GIDENLER_ISOLATED_TEST_DB!=='night-25'||process.env.VERCEL_ENV==='production')throw Error('Isolated test marker required');
http.createServer(async(req,res)=>{
  if(req.method!=='POST'||req.url!=='/v1/chat/completions'){res.writeHead(404);res.end();return;}
  let raw='';for await(const part of req){raw+=part;if(raw.length>100000){res.writeHead(413);res.end();return;}}
  try{
    const body=JSON.parse(raw),text=body.messages.at(-1).content;
    const block=text.match(/<gidenler_data name="candidates"[^>]*>\n(.*?)\n<\/gidenler_data>/s);
    // Deliberately wrong, but vocabulary-valid district: reproduces Issue #25.
    const content=block?{picks:JSON.parse(block[1]).slice(0,5).map(v=>({slug:v.slug,why:'Kayıtlı tür ve ilçe bilgisi.'})),note:null}:{action:'new',area:'Üsküdar',cuisine:null,attrs:[]};
    res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({choices:[{message:{content:JSON.stringify(content)}}],usage:{prompt_tokens:20,completion_tokens:10}}));
  }catch{res.writeHead(400);res.end();}
}).listen(3152,'127.0.0.1',()=>console.log('Isolated AI fixture listening on loopback; upstream calls disabled.'));
