'use strict';
// Layout counts count placed pieces, not purchased whole tiles; offcut reuse is excluded.
function calculateSurfaceLayout(width, height, tile, rotated = false) {
  const tileWidth = rotated ? tile.height : tile.width;
  const tileHeight = rotated ? tile.width : tile.height;
  const ratioX = Number((width / tileWidth).toPrecision(15));
  const ratioY = Number((height / tileHeight).toPrecision(15));
  const columns = Math.ceil(ratioX), rows = Math.ceil(ratioY);
  const wholeColumns = Math.floor(ratioX), wholeRows = Math.floor(ratioY);
  const total = columns * rows, whole = wholeColumns * wholeRows;
  return { width, height, tileWidth, tileHeight, columns, rows, wholeColumns, wholeRows,
    total, whole, cut: total - whole };
}
function createRoomSurfaces(width, length, height, wallTile, floorTile, wallRotated, floorRotated) {
  return [
    { id: 'back', name: '뒤쪽 벽', type: 'wall', origin: [0,length,0], u: [1,0,0], v: [0,0,1], normal: [0,-1,0], layout: calculateSurfaceLayout(width,height,wallTile,wallRotated) },
    { id: 'right', name: '오른쪽 벽', type: 'wall', origin: [width,length,0], u: [0,-1,0], v: [0,0,1], normal: [-1,0,0], layout: calculateSurfaceLayout(length,height,wallTile,wallRotated) },
    { id: 'front', name: '앞쪽 벽', type: 'wall', origin: [width,0,0], u: [-1,0,0], v: [0,0,1], normal: [0,1,0], layout: calculateSurfaceLayout(width,height,wallTile,wallRotated) },
    { id: 'left', name: '왼쪽 벽', type: 'wall', origin: [0,0,0], u: [0,1,0], v: [0,0,1], normal: [1,0,0], layout: calculateSurfaceLayout(length,height,wallTile,wallRotated) },
    { id: 'floor', name: '바닥', type: 'floor', origin: [0,0,0], u: [1,0,0], v: [0,1,0], normal: [0,0,1], layout: calculateSurfaceLayout(width,length,floorTile,floorRotated) }
  ];
}
function surfaceGrid(surface, key, numbers = true) {
  const l = surface.layout, color = surface.type === 'floor' ? '#d6e8f5' : '#daece3';
  const stroke = Math.max(2, Math.min(l.tileWidth,l.tileHeight) * 0.014);
  const fullWidth = Math.min(l.width,l.wholeColumns*l.tileWidth);
  const fullHeight = Math.min(l.height,l.wholeRows*l.tileHeight);
  let svg = `<defs><pattern id="grid-${key}" width="${l.tileWidth}" height="${l.tileHeight}" patternUnits="userSpaceOnUse"><rect width="${l.tileWidth}" height="${l.tileHeight}" fill="${color}"/><path d="M ${l.tileWidth} 0 H 0 V ${l.tileHeight}" fill="none" stroke="#7d9b90" stroke-width="${stroke}"/></pattern><pattern id="cut-${key}" width="80" height="80" patternUnits="userSpaceOnUse"><rect width="80" height="80" fill="#ffdf9b"/><path d="M -20 20 L 20 -20 M 0 80 L 80 0 M 60 100 L 100 60" stroke="#bc8126" stroke-width="5" opacity=".3"/></pattern></defs>`;
  svg += `<rect width="${l.width}" height="${l.height}" fill="url(#grid-${key})"/>`;
  if (fullWidth < l.width) svg += `<rect x="${fullWidth}" width="${l.width-fullWidth}" height="${l.height}" fill="url(#cut-${key})"/>`;
  if (fullHeight < l.height) svg += `<rect y="${fullHeight}" width="${fullWidth}" height="${l.height-fullHeight}" fill="url(#cut-${key})"/>`;
  // Grid strokes are bounded independently of room size.
  if (l.cut > 0 && l.columns + l.rows <= 400) {
    let lines = '';
    for (let x=1;x<l.columns;x++) lines += `M ${x*l.tileWidth} 0 V ${l.height} `;
    for (let y=1;y<l.rows;y++) lines += `M 0 ${y*l.tileHeight} H ${l.width} `;
    svg += `<path d="${lines}" stroke="#7d9b90" stroke-width="${stroke}" fill="none"/>`;
  }
  if (numbers && l.total <= 160) {
    for (let row=0;row<l.rows;row++) for (let col=0;col<l.columns;col++) {
      const w=Math.min(l.tileWidth,l.width-col*l.tileWidth), h=Math.min(l.tileHeight,l.height-row*l.tileHeight);
      const x=col*l.tileWidth+w/2, y=row*l.tileHeight+h/2;
      const font=Math.min(w,h)*0.24;
      if (font >= Math.min(l.tileWidth,l.tileHeight)*0.07) svg += `<text x="${x}" y="${y}" font-size="${font}" text-anchor="middle" dominant-baseline="central" fill="#315348">${row*l.columns+col+1}</text>`;
    }
  }
  return svg + `<rect width="${l.width}" height="${l.height}" fill="none" stroke="#48675a" stroke-width="${stroke*1.5}"/>`;
}
function renderUnfolded(surfaces, width, length, height) {
  const gap = 32, canvasW=900, canvasH=650;
  const scale = Math.min((canvasW-110)/(width+2*height), (canvasH-130)/(length+2*height));
  const fw=width*scale, fl=length*scale, wh=height*scale;
  const cx=canvasW/2, cy=canvasH/2;
  const x=cx-fw/2, y=cy-fl/2;
  const position = {
    floor: [x,y,fw,fl], back: [x,y-wh-gap/2,fw,wh],
    front: [x,y+fl+gap/2,fw,wh],
    left: [x-wh-gap/2,y,wh,fl], right: [x+fw+gap/2,y,wh,fl]
  };
  let svg='';
  for (const surface of surfaces) {
    const [px,py,pw,ph]=position[surface.id], l=surface.layout;
    let matrix;
    if (surface.id==='left') matrix=[0,scale,-scale,0,px+pw,py];
    else if(surface.id==='right') matrix=[0,-scale,scale,0,px,py+ph];
    else if(surface.id==='back') matrix=[scale,0,0,-scale,px,py+ph];
    else if(surface.id==='front') matrix=[-scale,0,0,scale,px+pw,py];
    else matrix=[scale,0,0,scale,px,py];
    svg += `<g transform="matrix(${matrix.join(' ')})">${surfaceGrid(surface,'plan-'+surface.id)}</g>`;
    svg += `<text x="${px+pw/2}" y="${py+ph/2}" text-anchor="middle" class="face-label" paint-order="stroke" stroke="white" stroke-width="5">${surface.name}</text>`;
    // Dimension labels sit outside the net, while individual tile numbers remain inside.
    if(surface.id==='back'||surface.id==='front') svg += `<text x="${px+pw/2}" y="${surface.id==='back'?py-12:py+ph+20}" text-anchor="middle" class="dimension-label">${l.width} × ${l.height} mm</text>`;
  }
  return `<svg viewBox="0 0 ${canvasW} ${canvasH}" role="img" aria-label="욕실 바닥과 네 벽의 타일 전개도">${svg}</svg>`;
}
function renderRoom3D(surfaces,width,length,height,angle) {
  const theta=angle*Math.PI/180, cos=Math.cos(theta), sin=Math.sin(theta);
  const project=([x,y,z]) => {
    x-=width/2; y-=length/2;
    return [x*cos-y*sin, (x*sin+y*cos)*0.46-z*0.88];
  };
  const corners=[];
  for(const x of [0,width]) for(const y of [0,length]) for(const z of [0,height]) corners.push(project([x,y,z]));
  const minX=Math.min(...corners.map(p=>p[0])),maxX=Math.max(...corners.map(p=>p[0]));
  const minY=Math.min(...corners.map(p=>p[1])),maxY=Math.max(...corners.map(p=>p[1]));
  const scale=Math.min(760/(maxX-minX),510/(maxY-minY));
  const px=450-(minX+maxX)/2*scale,py=310-(minY+maxY)/2*scale;
  const p=point=>{const q=project(point);return[q[0]*scale+px,q[1]*scale+py]};
  const visible=surfaces.filter(s=>s.type==='floor'||s.normal[0]*sin+s.normal[1]*cos > 0.00001);
  // Hide the two nearer walls so the floor and inside wall faces remain visible.
  visible.sort((a,b)=>a.type==='floor'?-1:b.type==='floor'?1:0);
  let svg='';
  for(const s of visible) {
    const o=p(s.origin),u=p(s.origin.map((v,i)=>v+s.u[i])),v=p(s.origin.map((x,i)=>x+s.v[i]));
    const matrix=[u[0]-o[0],u[1]-o[1],v[0]-o[0],v[1]-o[1],o[0],o[1]];
    svg+=`<g transform="matrix(${matrix.join(' ')})">${surfaceGrid(s,'room-'+s.id,false)}</g>`;
    const label=p(s.origin.map((v,i)=>v+s.u[i]*s.layout.width/2+s.v[i]*s.layout.height/2));
    svg+=`<text x="${label[0]}" y="${label[1]}" text-anchor="middle" class="face-label" paint-order="stroke" stroke="white" stroke-width="5">${s.name}</text>`;
  }
  return `<svg viewBox="0 0 900 620" role="img" aria-label="회전 가능한 욕실 내부 타일 3D 보기">${svg}</svg>`;
}
let roomVisualizationState;
function renderVisualization(width,length,height,wallTile,floorTile) {
  roomVisualizationState={width,length,height,wallTile,floorTile};
  const wallRotated=document.getElementById('wallOrientation').value==='rotated';
  const floorRotated=document.getElementById('floorOrientation').value==='rotated';
  const surfaces=createRoomSurfaces(width,length,height,wallTile,floorTile,wallRotated,floorRotated);
  if(!surfaces.every(s=>Number.isSafeInteger(s.layout.total))) {
    document.getElementById('visualization').hidden=true; return;
  }
  document.getElementById('visualization').hidden=false;
  document.getElementById('planView').innerHTML=renderUnfolded(surfaces,width,length,height);
  document.getElementById('roomView').innerHTML=renderRoom3D(surfaces,width,length,height,Number(document.getElementById('viewAngle').value));
  document.getElementById('surfaceRows').innerHTML=surfaces.map(s=>`<tr><th scope="row">${s.name}</th><td>${s.layout.width} × ${s.layout.height}</td><td>${s.layout.columns}열 × ${s.layout.rows}행</td><td>${s.layout.whole.toLocaleString('ko-KR')}</td><td>${s.layout.cut.toLocaleString('ko-KR')}</td><td><strong>${s.layout.total.toLocaleString('ko-KR')}</strong></td></tr>`).join('');
  for(const type of ['wall','floor']) {
    const group=surfaces.filter(s=>s.type===type);
    const whole=group.reduce((sum,s)=>sum+s.layout.whole,0), cut=group.reduce((sum,s)=>sum+s.layout.cut,0);
    document.getElementById(type+'LayoutCount').textContent=`${type==='wall'?'벽':'바닥'} 배치 ${ (whole+cut).toLocaleString('ko-KR') }조각 · 온장 ${whole.toLocaleString('ko-KR')}장 + 절단 ${cut.toLocaleString('ko-KR')}조각`;
  }
}
function rotateRoomVisualization() {
  if(!roomVisualizationState)return;
  const {width,length,height,wallTile,floorTile}=roomVisualizationState;
  const surfaces=createRoomSurfaces(width,length,height,wallTile,floorTile,document.getElementById('wallOrientation').value==='rotated',document.getElementById('floorOrientation').value==='rotated');
  document.getElementById('roomView').innerHTML=renderRoom3D(surfaces,width,length,height,Number(document.getElementById('viewAngle').value));
}
