(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const entries = [...document.querySelectorAll('.rive-demo')].map(host => ({host, player:null, visible:false, paused:reduced.matches, artboard:host.dataset.demo==='loading'?'01 SEARCH':'Working Co', generation:0}));
  let library;
  function loadLibrary() {
    if (!library) library=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='./work-archive/rive/rive.js';
      script.onload=()=>{rive.RuntimeLoader.setWasmUrl('./work-archive/rive/rive.wasm');resolve();};
      script.onerror=()=>reject(Error('加载失败'));document.head.appendChild(script);
    });
    return library;
  }
  function sync(entry) {
    if(!entry.player||entry.host.querySelector('.rive-art').dataset.loaded!=='true')return;
    if(entry.visible&&!entry.paused&&!document.hidden)entry.player.play();else entry.player.pause();
    const control=entry.host.querySelector('.motion-toggle');control.disabled=false;
    control.textContent=entry.paused?'播放动画':'暂停动画';control.setAttribute('aria-pressed',String(!entry.paused));
  }
  async function mount(entry) {
    const ticket=++entry.generation;entry.player?.cleanup();entry.player=null;
    entry.host.querySelector('.rive-art').dataset.loaded='false';
    entry.host.querySelector('.rive-status').textContent='加载动画…';
    try {
      await loadLibrary();if(ticket!==entry.generation)return;
      const isWorking=entry.host.dataset.demo==='working';
      const instance=new rive.Rive({src:isWorking?'./work-archive/rive/working-co.riv':'./work-archive/rive/loading-studies.riv',canvas:entry.host.querySelector('canvas'),artboard:entry.artboard,stateMachines:isWorking?'Working':entry.artboard,autoplay:false,layout:new rive.Layout({fit:rive.Fit.Contain,alignment:rive.Alignment.Center}),
        onLoad(){if(ticket!==entry.generation)return;entry.player=instance;instance.resizeDrawingSurfaceToCanvas();entry.host.querySelector('.rive-art').dataset.loaded='true';entry.host.querySelector('.rive-status').textContent='';sync(entry);},
        onLoadError(){fail(entry,ticket);}
      });
      entry.player=instance;
    }catch{fail(entry,ticket);}
  }
  function fail(entry,ticket){if(ticket!==entry.generation)return;entry.host.querySelector('.rive-status').textContent='动画未能加载，请刷新重试';entry.host.querySelector('.motion-toggle').textContent='加载失败';}
  const observer=new IntersectionObserver(items=>items.forEach(item=>{
    const entry=entries.find(e=>e.host===item.target);entry.visible=item.isIntersecting;
    if(entry.visible&&!entry.player&&!entry.generation)mount(entry);else sync(entry);
  }),{threshold:.05});
  entries.forEach(entry=>{
    observer.observe(entry.host);
    entry.host.querySelector('.motion-toggle').addEventListener('click',()=>{entry.paused=!entry.paused;sync(entry);});
    entry.host.querySelectorAll('[data-artboard]').forEach(button=>button.addEventListener('click',()=>{
      entry.artboard=button.dataset.artboard;entry.host.querySelectorAll('[data-artboard]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));mount(entry);
    }));
  });
  document.addEventListener('visibilitychange',()=>entries.forEach(sync));
  reduced.addEventListener('change',()=>entries.forEach(e=>{e.paused=reduced.matches;sync(e);}));
  window.addEventListener('resize',()=>entries.forEach(e=>e.player?.resizeDrawingSurfaceToCanvas()));
  window.addEventListener('pagehide',()=>entries.forEach(e=>e.player?.cleanup()));
})();
