import { TITLE, VERSION, AUTHOR } from './const.js';

const CSS = `
#ui{position:fixed;inset:0;pointer-events:none;font-family:"Microsoft JhengHei","微軟正黑體","PingFang TC","Noto Sans TC",sans-serif;color:#f3ead4}
#ui *{box-sizing:border-box}
.gold{color:#e8c25a}
.sig{font-style:italic;color:#d9ae3c;letter-spacing:.06em;text-shadow:0 1px 3px #000}
.hud{position:absolute;left:0;right:0;bottom:0;height:clamp(96px,15vh,170px);display:flex;align-items:stretch;gap:0;
  background:linear-gradient(180deg,rgba(24,20,18,.0) 0,rgba(20,16,14,.82) 22%,rgba(14,11,10,.96) 100%);border-top:2px solid rgba(214,170,70,.55);padding:0 2vw}
.hud:before{content:"";position:absolute;left:0;right:0;top:-2px;height:2px;background:linear-gradient(90deg,transparent,#e8c25a,transparent)}
.blk{display:flex;flex-direction:column;justify-content:center;align-items:center;padding:0 clamp(10px,1.8vw,30px);min-width:0;position:relative}
.blk+.blk:before{content:"";position:absolute;left:0;top:18%;bottom:18%;width:1px;background:linear-gradient(180deg,transparent,rgba(214,170,70,.5),transparent)}
.lab{font-size:clamp(14px,2.1vh,24px);color:#c9b27a;letter-spacing:.2em;margin-bottom:.2vh}
.val{font-size:clamp(34px,6.4vh,74px);font-weight:700;line-height:1;font-variant-numeric:tabular-nums;text-shadow:0 2px 6px #000;min-width:2.2ch;text-align:center}
.val.sm{font-size:clamp(26px,4.4vh,52px)}
.val.low{color:#ff5a4a;animation:pulse .8s infinite}
@keyframes pulse{50%{opacity:.55}}
#face{width:clamp(84px,13vh,150px);height:clamp(84px,13vh,150px);align-self:center;border:2px solid #b88f35;border-radius:6px;background:#201a15;box-shadow:inset 0 0 12px #000,0 0 14px rgba(0,0,0,.6)}
.keys{display:flex;gap:10px;height:clamp(30px,5vh,56px);align-items:center}
.key{width:clamp(24px,4vh,44px);height:clamp(24px,4vh,44px);opacity:.18;filter:grayscale(1)}
.key.on{opacity:1;filter:none;filter:drop-shadow(0 0 8px currentColor)}
.grow{flex:1}
.side{flex:1;display:flex;align-items:stretch;min-width:0}.side.l{justify-content:flex-end}.side.r{justify-content:flex-start}
#cross{position:absolute;left:50%;top:50%;width:0;height:0}
#cross i{position:absolute;background:rgba(255,238,190,.92);box-shadow:0 0 4px #000}
#cross i:nth-child(1){left:-1px;top:-16px;width:2px;height:8px}#cross i:nth-child(2){left:-1px;top:8px;width:2px;height:8px}
#cross i:nth-child(3){top:-1px;left:-16px;height:2px;width:8px}#cross i:nth-child(4){top:-1px;left:8px;height:2px;width:8px}
#cross b{position:absolute;left:-2px;top:-2px;width:4px;height:4px;border-radius:50%;background:#ffe6a0;box-shadow:0 0 5px #000}
#cross.hit i,#cross.hit b{background:#ff5040}
#toasts{position:absolute;left:2vw;top:2.5vh;display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.toast{font-size:clamp(22px,3.4vh,38px);font-weight:700;padding:6px 16px;background:rgba(10,8,6,.62);border-left:5px solid #e8c25a;border-radius:3px;text-shadow:0 2px 4px #000;animation:tin .25s ease-out;transition:opacity .5s}
.toast.bad{border-color:#ff5a4a}.toast.good{border-color:#7ae27a}
@keyframes tin{from{transform:translateX(-30px);opacity:0}}
#prompt{position:absolute;left:0;right:0;bottom:calc(clamp(96px,15vh,170px) + 4vh);text-align:center;font-size:clamp(26px,4.2vh,46px);font-weight:700;text-shadow:0 2px 8px #000,0 0 18px #000;opacity:0;transition:opacity .15s}
#prompt.on{opacity:1}
#prompt kbd{display:inline-block;min-width:1.6em;padding:0 .35em;border:2px solid #e8c25a;border-radius:8px;background:rgba(0,0,0,.6);color:#e8c25a;margin:0 .15em}
#mini{position:absolute;right:1.5vw;top:2vh;width:clamp(150px,22vh,260px);height:clamp(150px,22vh,260px);border:2px solid rgba(214,170,70,.6);border-radius:6px;background:rgba(8,6,5,.55)}
#boss{position:absolute;left:25%;right:25%;top:2.5vh;opacity:0;transition:opacity .4s;text-align:center}
#boss.on{opacity:1}
#boss .nm{font-size:clamp(20px,3vh,34px);letter-spacing:.3em;color:#ffcf6a;text-shadow:0 2px 6px #000;margin-bottom:6px}
#boss .bar{height:clamp(14px,2.2vh,24px);border:2px solid #d9ae3c;background:rgba(10,0,0,.7);border-radius:4px;overflow:hidden}
#boss .bar div{height:100%;background:linear-gradient(180deg,#ff6a50,#a01818);width:100%;transition:width .15s}
#wlist{position:absolute;right:1.5vw;bottom:calc(clamp(96px,15vh,170px) + 2vh);display:flex;gap:8px}
.wslot{width:clamp(40px,6vh,64px);height:clamp(40px,6vh,64px);border:2px solid rgba(214,170,70,.35);border-radius:6px;background:rgba(10,8,6,.55);display:flex;align-items:center;justify-content:center;font-size:clamp(18px,3vh,32px);font-weight:700;color:#8a7a52}
.wslot.own{color:#e8d8a8;border-color:rgba(214,170,70,.7)}.wslot.cur{background:rgba(214,170,70,.28);border-color:#ffd870;color:#fff;box-shadow:0 0 14px rgba(255,210,100,.5)}
#map{position:absolute;inset:0;background:rgba(6,5,4,.8);display:none;align-items:center;justify-content:center;flex-direction:column;gap:1.5vh}
#map.on{display:flex}
#map canvas{max-width:92vw;max-height:76vh;border:2px solid #b88f35;background:#0a0807;border-radius:6px}
#map .t{font-size:clamp(24px,3.6vh,42px);font-weight:700;color:#e8c25a}
#map .h{font-size:clamp(18px,2.6vh,28px);color:#cbbd96}
.screen{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;text-align:center;background:radial-gradient(ellipse at center,rgba(0,0,0,.25) 0,rgba(0,0,0,.78) 100%)}
.screen.on{display:flex}
.screen.dim{background:rgba(5,4,3,.82)}
.title{font-size:clamp(60px,15vh,170px);font-weight:900;letter-spacing:.14em;line-height:1.05;color:#f0cf74;text-shadow:0 0 28px rgba(255,170,40,.55),0 4px 0 #6a4a10,0 8px 20px #000;margin-left:.14em}
.sub{font-size:clamp(18px,3vh,34px);letter-spacing:.7em;color:#cbb78a;margin:1vh 0 5vh .7em;text-shadow:0 2px 6px #000}
.menu{display:flex;flex-direction:column;gap:clamp(10px,1.8vh,20px);align-items:center}
.btn{font-family:inherit;font-size:clamp(28px,4.8vh,52px);font-weight:700;color:#f3ead4;background:linear-gradient(180deg,rgba(60,48,34,.92),rgba(30,24,18,.92));border:2px solid #b88f35;border-radius:10px;padding:.35em 1.8em;min-width:min(78vw,9em);cursor:pointer;text-shadow:0 2px 4px #000;letter-spacing:.2em;transition:all .12s}
.btn:hover,.btn.sel{background:linear-gradient(180deg,#8a6a22,#5a4212);border-color:#ffd870;color:#fff;transform:scale(1.04);box-shadow:0 0 22px rgba(255,200,80,.45)}
.foot{position:absolute;bottom:2.5vh;left:0;right:0;font-size:clamp(18px,2.8vh,30px)}
.panel{background:rgba(14,11,9,.88);border:2px solid #b88f35;border-radius:14px;padding:2.4vh 4vw;max-width:92vw;max-height:97vh;overflow:hidden;box-shadow:0 0 40px #000}
#s-pause .btn{font-size:clamp(22px,3.5vh,38px);padding:.2em 1.4em}
#s-pause .slider{margin:.6vh 0;font-size:clamp(22px,3.4vh,38px)}
#s-pause h2{margin-bottom:1vh}
.panel h2{margin:0 0 2vh;font-size:clamp(34px,5.4vh,60px);color:#f0cf74;letter-spacing:.2em}
.row{display:flex;justify-content:space-between;gap:4vw;font-size:clamp(24px,4vh,44px);padding:.5vh 0;border-bottom:1px solid rgba(214,170,70,.2)}
.row span:last-child{color:#fff;font-weight:700;font-variant-numeric:tabular-nums}
.help{display:grid;grid-template-columns:auto auto;gap:1.2vh 3vw;font-size:clamp(22px,3.7vh,40px);text-align:left}
.help b{color:#e8c25a;font-weight:700}
.hint{margin-top:3vh;font-size:clamp(20px,3.2vh,34px);color:#cbbd96}
.slider{display:flex;align-items:center;gap:2vw;font-size:clamp(24px,4vh,44px);margin:1.4vh 0}
.slider label{min-width:5em;text-align:right}
.slider input{width:30vw;height:clamp(24px,4vh,44px);accent-color:#e8c25a}
.seg{display:flex;gap:10px}.seg .btn{font-size:clamp(22px,3.6vh,40px);min-width:0;padding:.25em 1em;letter-spacing:.1em}
.seg .btn.on{background:linear-gradient(180deg,#8a6a22,#5a4212);border-color:#ffd870}
#fade{position:absolute;inset:0;background:#000;opacity:0;transition:opacity .6s;pointer-events:none}
#click{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.45);pointer-events:auto;font-size:clamp(30px,5vh,56px);font-weight:700;text-shadow:0 2px 10px #000;cursor:pointer}
#click.on{display:flex}
.big{font-size:clamp(46px,9vh,110px);font-weight:900;letter-spacing:.2em;text-shadow:0 0 30px rgba(255,60,40,.5),0 6px 16px #000}
`;

export function mountUI() {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const root = document.getElementById('ui');
  root.innerHTML = `
  <div id="cross"><i></i><i></i><i></i><i></i><b></b></div>
  <div id="toasts"></div>
  <div id="boss"><div class="nm">城堡統領</div><div class="bar"><div></div></div></div>
  <canvas id="mini" width="260" height="260"></canvas>
  <div id="wlist"></div>
  <div id="prompt"></div>
  <div class="hud" id="hud">
    <div class="side l">
      <div class="blk"><div class="lab" id="lvname">第 1 關</div><div class="val sm" id="kills" style="font-size:clamp(22px,3.6vh,42px)">0/0</div></div>
      <div class="blk"><div class="lab">分數</div><div class="val sm" id="score">0</div></div>
      <div class="blk"><div class="lab">命</div><div class="val sm" id="lives">3</div></div>
    </div>
    <canvas id="face" width="96" height="96"></canvas>
    <div class="side r">
      <div class="blk"><div class="lab">生命</div><div class="val" id="hp">100</div></div>
      <div class="blk"><div class="lab">護甲</div><div class="val sm" id="ar">0</div></div>
      <div class="blk"><div class="lab" id="wname">手槍</div><div class="val" id="ammo">12<span style="font-size:.5em;color:#bba773"> / 40</span></div></div>
      <div class="blk"><div class="lab">鑰匙</div><div class="keys"><svg class="key" id="kg" style="color:#ffd040" viewBox="0 0 32 32"><circle cx="9" cy="16" r="6" fill="none" stroke="#ffd040" stroke-width="3"/><path d="M15 16h15M25 16v6M30 16v4" stroke="#ffd040" stroke-width="3" fill="none"/></svg><svg class="key" id="ks" style="color:#cfe4ff" viewBox="0 0 32 32"><circle cx="9" cy="16" r="6" fill="none" stroke="#cfe4ff" stroke-width="3"/><path d="M15 16h15M25 16v6M30 16v4" stroke="#cfe4ff" stroke-width="3" fill="none"/></svg></div></div>
    </div>
  </div>
  <div id="map"><div class="t" id="mapt">城堡地圖</div><canvas id="mapc" width="900" height="700"></canvas><div class="h">按 Tab 或 M 關閉</div></div>

  <div class="screen" id="s-title">
    <div class="title">${TITLE}</div>
    <div class="sub">CASTLE STRIKE</div>
    <div class="menu" id="m-title"></div>
    <div class="foot"><span class="sig">${AUTHOR}　${VERSION}</span></div>
  </div>
  <div class="screen dim" id="s-help"><div class="panel"><h2>操作說明</h2><div class="help">
    <b>W A S D　或　方向鍵</b><span>前進、後退、左右走</span>
    <b>滑鼠移動</b><span>轉頭、瞄準</span>
    <b>滑鼠左鍵　或　F</b><span>開槍</span>
    <b>E　或　空白鍵</b><span>開門、推牆、搭電梯</span>
    <b>1 ～ 5　或　滑鼠滾輪</b><span>換武器</span>
    <b>R</b><span>換彈匣</span>
    <b>Tab　或　M</b><span>看地圖</span>
    <b>Esc</b><span>暫停、設定</span>
  </div><div class="hint">牆壁有可疑裂縫時，面對它按 E，可能有秘密房間！</div><div class="menu" style="margin-top:3vh"><button class="btn sel" data-act="back">返回</button></div></div></div>
  <div class="screen dim" id="s-pause"><div class="panel"><h2>暫停</h2>
    <div class="slider"><label>音樂</label><input type="range" id="r-music" min="0" max="100"><span id="v-music" style="min-width:3ch"></span></div>
    <div class="slider"><label>音效</label><input type="range" id="r-sfx" min="0" max="100"><span id="v-sfx" style="min-width:3ch"></span></div>
    <div class="slider"><label>滑鼠靈敏度</label><input type="range" id="r-sens" min="20" max="200"><span id="v-sens" style="min-width:3ch"></span></div>
    <div class="slider"><label>難度</label><div class="seg" id="seg-d"><button class="btn" data-d="easy">輕鬆</button><button class="btn" data-d="normal">普通</button><button class="btn" data-d="hard">困難</button></div></div>
    <div class="slider"><label>畫質</label><div class="seg" id="seg-q"><button class="btn" data-q="high">高</button><button class="btn" data-q="mid">中</button><button class="btn" data-q="low">低</button></div></div>
    <div class="menu" style="margin-top:1.2vh" id="m-pause"></div>
    <div style="margin-top:2.5vh"><span class="sig" style="font-size:clamp(18px,2.8vh,30px)">${AUTHOR}　${VERSION}</span></div></div></div>
  <div class="screen dim" id="s-sum"><div class="panel"><h2 id="sum-t">本關完成</h2><div id="sum-rows"></div><div class="hint" id="sum-h">按 Enter 繼續</div><div style="margin-top:2.5vh"><span class="sig" style="font-size:clamp(18px,2.8vh,30px)">${AUTHOR}　${VERSION}</span></div></div></div>
  <div class="screen" id="s-dead" style="background:radial-gradient(ellipse at center,rgba(90,0,0,.5),rgba(20,0,0,.92))"><div class="big" style="color:#ff5a4a" id="dead-t">你倒下了</div><div class="sub" id="dead-s" style="margin-top:2vh"></div><div class="menu" style="margin-top:5vh" id="m-dead"></div></div>
  <div class="screen dim" id="s-win"><div class="title" style="font-size:clamp(50px,12vh,140px)">大獲全勝</div><div class="sub" style="margin-bottom:3vh">城堡已經收復</div><div class="panel" style="padding:2vh 3vw"><div id="win-rows"></div></div><div class="menu" style="margin-top:3vh" id="m-win"></div><div class="foot"><span class="sig">${AUTHOR}　${VERSION}</span></div></div>
  <div class="screen dim" id="s-load"><div class="title" style="font-size:clamp(40px,8vh,90px)" id="load-t">準備中…</div><div class="sub" id="load-s" style="margin-bottom:3vh">城堡正在建造</div><div style="width:50vw;height:clamp(18px,3vh,30px);border:2px solid #d9ae3c;border-radius:6px;background:rgba(0,0,0,.6);overflow:hidden"><div id="load-b" style="height:100%;width:0;background:linear-gradient(180deg,#f0cf74,#a07a1c);transition:width .15s"></div></div><div class="hint" id="load-h" style="margin-top:3vh">請稍等幾秒鐘</div><div class="foot"><span class="sig">${AUTHOR}　${VERSION}</span></div></div>
  <div id="click">點一下畫面繼續遊戲</div>
  <div id="fade"></div>`;
  const $ = (id) => document.getElementById(id);
  return { root, $, mini: $('mini'), face: $('face'), mapc: $('mapc') };
}

// ---------- 臉部肖像 ----------
export function drawFace(cv, hpFrac, look, mood, t) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height;
  const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#3a322b'); bg.addColorStop(1, '#1a1511');
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  if (mood === 'dead') {
    c.fillStyle = '#3a0a0a'; c.fillRect(0, 0, W, H);
  }
  const hurt = 1 - hpFrac;
  const skin = mood === 'dead' ? '#9a8a7a' : hurt > 0.6 ? '#d6a888' : '#e6b896';
  // 肩/制服
  c.fillStyle = '#4a5666'; c.beginPath(); c.moveTo(0, H); c.lineTo(10, H - 18); c.lineTo(W / 2 - 14, H - 24); c.lineTo(W / 2 + 14, H - 24); c.lineTo(W - 10, H - 18); c.lineTo(W, H); c.fill();
  c.fillStyle = '#d4b04a'; c.fillRect(W / 2 - 3, H - 22, 6, 22);
  // 脖子
  c.fillStyle = skin; c.fillRect(W / 2 - 11, H - 36, 22, 16);
  // 頭
  const lx = look * 3;
  c.fillStyle = skin; c.beginPath(); c.ellipse(W / 2 + lx, 44, 27, 31, 0, 0, 7); c.fill();
  c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); c.ellipse(W / 2 + lx + 10, 50, 14, 26, 0, 0, 7); c.fill();
  // 頭髮
  c.fillStyle = '#8a6a30'; c.beginPath(); c.moveTo(W / 2 - 28 + lx, 40); c.quadraticCurveTo(W / 2 - 30 + lx, 8, W / 2 + lx, 8); c.quadraticCurveTo(W / 2 + 30 + lx, 8, W / 2 + 28 + lx, 40); c.quadraticCurveTo(W / 2 + 20 + lx, 24, W / 2 + lx, 24); c.quadraticCurveTo(W / 2 - 20 + lx, 24, W / 2 - 28 + lx, 40); c.fill();
  // 耳
  c.fillStyle = skin; c.beginPath(); c.ellipse(W / 2 - 27 + lx, 46, 4, 7, 0, 0, 7); c.ellipse(W / 2 + 27 + lx, 46, 4, 7, 0, 0, 7); c.fill();
  // 眼
  const ey = 42, blink = mood !== 'dead' && (t % 4.2) < 0.12;
  for (const sx of [-1, 1]) {
    const ex = W / 2 + sx * 11 + lx;
    c.fillStyle = '#f4f0e8';
    if (mood === 'dead') { c.strokeStyle = '#201510'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(ex - 5, ey - 4); c.lineTo(ex + 5, ey + 4); c.moveTo(ex + 5, ey - 4); c.lineTo(ex - 5, ey + 4); c.stroke(); }
    else if (blink) { c.fillStyle = '#201510'; c.fillRect(ex - 5, ey, 10, 2); }
    else { c.beginPath(); c.ellipse(ex, ey, 5.5, mood === 'hurt' ? 4 : 5, 0, 0, 7); c.fill(); c.fillStyle = '#2a5a8a'; c.beginPath(); c.arc(ex + look * 2, ey, 2.8, 0, 7); c.fill(); c.fillStyle = '#000'; c.beginPath(); c.arc(ex + look * 2, ey, 1.3, 0, 7); c.fill(); }
    // 眉
    c.strokeStyle = '#6a4a1e'; c.lineWidth = 3; c.beginPath();
    const tilt = mood === 'hurt' ? sx * -3 : mood === 'grin' ? 0 : hurt > 0.5 ? sx * 3 : 0;
    c.moveTo(ex - 7, ey - 9 - tilt); c.lineTo(ex + 7, ey - 9 + tilt); c.stroke();
  }
  // 鼻
  c.strokeStyle = 'rgba(90,50,30,.55)'; c.lineWidth = 2; c.beginPath(); c.moveTo(W / 2 + lx, 46); c.lineTo(W / 2 - 3 + lx, 56); c.lineTo(W / 2 + 2 + lx, 57); c.stroke();
  // 嘴
  c.strokeStyle = '#5a2a20'; c.lineWidth = 3; c.beginPath();
  if (mood === 'grin') { c.fillStyle = '#fff'; c.moveTo(W / 2 - 12 + lx, 66); c.quadraticCurveTo(W / 2 + lx, 78, W / 2 + 12 + lx, 66); c.stroke(); c.beginPath(); c.moveTo(W / 2 - 11 + lx, 67); c.quadraticCurveTo(W / 2 + lx, 76, W / 2 + 11 + lx, 67); c.closePath(); c.fill(); }
  else if (mood === 'hurt' || mood === 'dead') { c.ellipse(W / 2 + lx, 68, 7, 5, 0, 0, 7); c.fillStyle = '#400'; c.fill(); c.stroke(); }
  else { c.moveTo(W / 2 - 9 + lx, 67); c.quadraticCurveTo(W / 2 + lx, hurt > 0.5 ? 64 : 70, W / 2 + 9 + lx, 67); c.stroke(); }
  // 傷
  c.strokeStyle = 'rgba(190,20,20,.85)'; c.lineWidth = 2.2;
  if (hurt > 0.25) { c.beginPath(); c.moveTo(W / 2 + 6 + lx, 26); c.lineTo(W / 2 + 14 + lx, 40); c.stroke(); }
  if (hurt > 0.5) { c.beginPath(); c.moveTo(W / 2 - 20 + lx, 52); c.lineTo(W / 2 - 8 + lx, 58); c.stroke(); c.fillStyle = 'rgba(190,20,20,.7)'; c.beginPath(); c.arc(W / 2 - 14 + lx, 34, 3, 0, 7); c.fill(); }
  if (hurt > 0.75) { c.beginPath(); c.moveTo(W / 2 + 16 + lx, 56); c.lineTo(W / 2 + 22 + lx, 70); c.stroke(); c.fillStyle = 'rgba(190,20,20,.55)'; c.fillRect(W / 2 - 24 + lx, 36, 8, 14); c.fillRect(W / 2 + 6 + lx, 60, 3, 18); }
}
