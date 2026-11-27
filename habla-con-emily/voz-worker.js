/* Voz humana (Kokoro, open source) en un hilo aparte: así el juego 3D no se congela mientras genera la voz */
import {KokoroTTS} from "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js";
let tts=null,q=Promise.resolve();
self.onmessage=e=>{const d=e.data;
  if(d.type==="load"){KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX",{dtype:"q8",device:"wasm",
      progress_callback:p=>{if(p&&p.status==="progress"&&p.total>1e6)self.postMessage({type:"progress",pct:Math.round(p.progress||0)})}})
    .then(t=>{tts=t;self.postMessage({type:"ready"})}).catch(err=>self.postMessage({type:"error",msg:String(err&&err.message||err)}));return}
  if(d.type==="gen"){q=q.then(async()=>{try{const a=await tts.generate(d.text,{voice:d.voice,speed:d.speed});const buf=a.audio;self.postMessage({type:"audio",id:d.id,audio:buf,sr:a.sampling_rate},[buf.buffer])}
      catch(err){self.postMessage({type:"audio",id:d.id,error:String(err&&err.message||err)})}})}};
