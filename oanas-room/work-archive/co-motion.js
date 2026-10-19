(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const entries = [...document.querySelectorAll('.rive-demo')].map(host => ({host, player:null, visible:false, paused:reduced.matches, artboard:host.dataset.demo==='loading'?'01 SEARCH':'Working Co', generation:0, pool:new Map(), pending:new Map()}));
  let library;
  const files = new Map();
  function loadLibrary() {
    if (!library) library=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='./work-archive/rive/rive.js';
      script.onload=()=>{rive.RuntimeLoader.setWasmUrl('./work-archive/rive/rive.wasm');resolve();};
      script.onerror=()=>reject(Error('加载失败'));document.head.appendChild(script);
    });
    return library;
  }
  function sync(entry) {
    entry.pool.forEach(({player})=>{
      if(player===entry.player&&entry.visible&&!entry.paused&&!document.hidden)player.play();else player.pause();
    });
    if(!entry.player)return;
    const control=entry.host.querySelector('.motion-toggle');control.disabled=false;
    control.textContent=entry.paused?'播放动画':'暂停动画';control.setAttribute('aria-pressed',String(!entry.paused));
  }
  async function prepare(entry, artboard) {
    if(entry.pending.has(artboard))return entry.pending.get(artboard);
    const task=(async()=>{
      await loadLibrary();
      const isWorking=entry.host.dataset.demo==='working';
      const src=isWorking?'./work-archive/rive/working-co.riv':'./work-archive/rive/loading-studies.riv';
      if(!files.has(src))files.set(src,fetch(src).then(r=>{if(!r.ok)throw Error('加载失败');return r.arrayBuffer();}));
      const buffer=await files.get(src);
      const stage=entry.host.querySelector('.rive-art');
      const canvas=entry.pool.size===0&&!stage.querySelector('canvas[data-prepared]')?stage.querySelector('canvas'):document.createElement('canvas');
      canvas.dataset.prepared='true';canvas.dataset.active='false';canvas.setAttribute('aria-hidden','true');
      if(!canvas.isConnected)stage.appendChild(canvas);
      return new Promise((resolve,reject)=>{
        const player=new rive.Rive({buffer,canvas,artboard,stateMachines:isWorking?'Working':artboard,autoplay:true,layout:new rive.Layout({fit:rive.Fit.Contain,alignment:rive.Alignment.Center}),
          onLoad(){
            player.resizeDrawingSurfaceToCanvas();
            // Render the new canvas before revealing it; keep the current drawing visible.
            requestAnimationFrame(()=>requestAnimationFrame(()=>{
              player.pause();const prepared={player,canvas};entry.pool.set(artboard,prepared);resolve(prepared);
            }));
          },
          onLoadError(){player.cleanup();canvas.remove();reject(Error('动画加载失败'));}
        });
      });
    })();
    entry.pending.set(artboard,task);
    task.catch(()=>entry.pending.delete(artboard));
    return task;
  }
  async function mount(entry) {
    const ticket=++entry.generation, artboard=entry.artboard;
    if(!entry.player)entry.host.querySelector('.rive-status').textContent='加载动画…';
    try {
      const prepared=await prepare(entry,artboard);
      if(ticket!==entry.generation)return;
      entry.pool.forEach(({canvas})=>{canvas.dataset.active='false';canvas.setAttribute('aria-hidden','true');});
      prepared.canvas.dataset.active='true';prepared.canvas.setAttribute('aria-hidden','false');entry.player=prepared.player;
      entry.host.querySelector('.rive-art').dataset.loaded='true';entry.host.querySelector('.rive-status').textContent='';
      entry.host.querySelectorAll('[data-artboard]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.artboard===artboard)));
      sync(entry);
      // Warm the remaining expressions once; switches reuse their rendered canvases.
      entry.host.querySelectorAll('[data-artboard]').forEach(b=>prepare(entry,b.dataset.artboard).catch(()=>{}));
    }catch{
      if(ticket!==entry.generation)return;
      entry.host.querySelector('.rive-status').textContent='动画未能加载，请重试';
    }
  }
  const observer=new IntersectionObserver(items=>items.forEach(item=>{
    const entry=entries.find(e=>e.host===item.target);entry.visible=item.isIntersecting;
    if(entry.visible&&!entry.player&&!entry.generation)mount(entry);else sync(entry);
  }),{threshold:.05});
  entries.forEach(entry=>{
    observer.observe(entry.host);
    entry.host.querySelector('.motion-toggle').addEventListener('click',()=>{entry.paused=!entry.paused;sync(entry);});
    entry.host.querySelectorAll('[data-artboard]').forEach(button=>button.addEventListener('click',()=>{
      if(entry.artboard===button.dataset.artboard&&entry.player)return;
      entry.artboard=button.dataset.artboard;mount(entry);
    }));
  });
  document.addEventListener('visibilitychange',()=>entries.forEach(sync));
  reduced.addEventListener('change',()=>entries.forEach(e=>{e.paused=reduced.matches;sync(e);}));
  window.addEventListener('resize',()=>entries.forEach(e=>e.pool.forEach(({player})=>player.resizeDrawingSurfaceToCanvas())));
  window.addEventListener('pagehide',()=>entries.forEach(e=>e.pool.forEach(({player})=>player.cleanup())));
})();
