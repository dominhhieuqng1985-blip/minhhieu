import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  MemorialPlotSlot,
  MemorialTombRecord,
  MEMORIAL_PLOT_SLOTS,
  TOMB_MATERIAL_CATALOG,
} from '../../data/buddhistTempleData';

interface MemorialPark3DCanvasProps {
  tombs: MemorialTombRecord[];
  selectedPlotCode: string | null;
  previewDraftTomb?: MemorialTombRecord | null;
  burningPlotCode?: string | null;
  timeOfDay?: 'day' | 'dusk' | 'night';
  cameraViewMode?: 'overview' | 'closeup';
  onSelectTomb: (tomb: MemorialTombRecord) => void;
  onSelectEmptyPlot: (slot: MemorialPlotSlot) => void;
  className?: string;
}

function getPlotWorldCoords(rowIndex: number, colIndex: number): { x: number; z: number } {
  // 6 columns split across central stone aisle: cols 0,1,2 on left; cols 3,4,5 on right
  const xPositions = [-7.8, -5.2, -2.6, 2.6, 5.2, 7.8];
  const zPositions = [-4.6, -1.0, 2.6, 6.2];
  return {
    x: xPositions[colIndex] ?? 0,
    z: zPositions[rowIndex] ?? 0,
  };
}

function wrapCanvasLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 2
): string[] {
  const words = (text || '').trim().split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length >= maxLines) break;
    } else {
      cur = test;
    }
  }
  if (cur && lines.length < maxLines) {
    lines.push(cur);
  }
  return lines;
}

/**
 * Creates dynamic lacquer & gold calligraphy signboards for pavilion shrines
 */
function createSignCanvasTexture(title: string, sub?: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#4a0d0d'; // Sơn son gụ đỏ
    ctx.fillRect(0, 0, 512, 140);

    // Khung viền thếp vàng kép
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, 500, 128);
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 14, 484, 112);

    // Chữ thư pháp vàng ánh kim
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 36px "Times New Roman", "Palatino Linotype", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 6;
    ctx.fillText(title, 256, sub ? 52 : 70);

    if (sub) {
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(sub, 256, 104);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * High-DPI Procedural 3D Gravestone Stele Texture (Bia Mộ 3D Thật Đầy Đủ Dương Lịch, Âm Lịch, Hưởng Thọ / Hưởng Dương)
 */
function createTombSteleCanvasTexture(
  tomb: MemorialTombRecord,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const matCfg =
    TOMB_MATERIAL_CATALOG.find((m) => m.id === tomb.materialId) || TOMB_MATERIAL_CATALOG[1];

  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // 1. Stone Slab Background with subtle mineral grain
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGrad.addColorStop(0, matCfg.steleBgHex);
  bgGrad.addColorStop(0.5, '#141920');
  bgGrad.addColorStop(1, matCfg.steleBgHex);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle gold/mineral speckles like real Kim Sa Granite
  ctx.fillStyle = 'rgba(255, 215, 110, 0.08)';
  for (let i = 0; i < 320; i++) {
    const sx = (i * 197) % canvas.width;
    const sy = (i * 353) % canvas.height;
    ctx.fillRect(sx, sy, (i % 3) + 1, (i % 2) + 1);
  }

  const goldColor = matCfg.steleTextHex || '#ffd86b';

  // 2. Traditional Double Engraved Border & Corner Fretwork
  ctx.strokeStyle = goldColor;
  ctx.lineWidth = 10;
  ctx.strokeRect(26, 26, canvas.width - 52, canvas.height - 52);

  ctx.lineWidth = 3;
  ctx.strokeRect(42, 42, canvas.width - 84, canvas.height - 84);

  // Corner traditional Vietnamese fretwork squares
  const corners = [
    [42, 42],
    [canvas.width - 78, 42],
    [42, canvas.height - 78],
    [canvas.width - 78, canvas.height - 78],
  ];
  corners.forEach(([cx, cy]) => {
    ctx.strokeRect(cx, cy, 36, 36);
    ctx.strokeRect(cx + 8, cy + 8, 20, 20);
  });

  ctx.textAlign = 'center';

  // 3. Top Buddhist Swastika / Dharma Lotus Emblem & Plot Tag
  ctx.fillStyle = goldColor;
  ctx.font = 'bold 48px Georgia, "Times New Roman", serif';
  ctx.fillText('🪷  卍  🪷', canvas.width / 2, 108);

  // Header (e.g., PHẬT QUANG TIẾP DẪN / CỐ PHỤ / CỐ MẪU)
  ctx.font = 'bold 30px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#ffe9a3';
  ctx.fillText((tomb.steleHeader || 'PHẬT QUANG TIẾP DẪN').toUpperCase(), canvas.width / 2, 158);

  // Decorative divider
  ctx.beginPath();
  ctx.moveTo(130, 178);
  ctx.lineTo(canvas.width - 130, 178);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = goldColor;
  ctx.stroke();

  // 4. Deceased Full Name (Họ và Tên Người Quá Cố)
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 6;
  const fullNameUpper = (tomb.deceasedFullName || 'NGƯỜI QUÁ CỐ').toUpperCase();
  ctx.font = fullNameUpper.length > 22 ? 'bold 40px "Times New Roman", serif' : 'bold 46px "Times New Roman", serif';
  const nameLines = wrapCanvasLines(ctx, fullNameUpper, canvas.width - 130, 2);
  let yCursor = 242;
  nameLines.forEach((line) => {
    ctx.fillText(line, canvas.width / 2, yCursor);
    yCursor += 52;
  });
  ctx.shadowBlur = 0;

  // Pháp danh (if provided)
  if (tomb.deceasedDharmaName && tomb.deceasedDharmaName.trim()) {
    ctx.fillStyle = goldColor;
    ctx.font = 'italic bold 28px "Times New Roman", serif';
    const pdText = tomb.deceasedDharmaName.toLowerCase().includes('pháp danh')
      ? tomb.deceasedDharmaName
      : `Pháp danh: ${tomb.deceasedDharmaName}`;
    ctx.fillText(pdText, canvas.width / 2, yCursor + 6);
    yCursor += 44;
  } else {
    yCursor += 14;
  }

  // 5. Birth Dates: SINH NGÀY (Dương Lịch + Âm Lịch)
  const boxLeft = 68;
  const boxWidth = canvas.width - 136;

  ctx.fillStyle = 'rgba(255, 216, 107, 0.08)';
  ctx.fillRect(boxLeft, yCursor + 6, boxWidth, 132);
  ctx.strokeStyle = 'rgba(255, 216, 107, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(boxLeft, yCursor + 6, boxWidth, 132);

  ctx.fillStyle = goldColor;
  ctx.font = 'bold 25px "Times New Roman", serif';
  ctx.fillText('✦ SINH NGÀY (DƯƠNG LỊCH & ÂM LỊCH) ✦', canvas.width / 2, yCursor + 42);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 28px "Times New Roman", serif';
  ctx.fillText(`Dương lịch: ${tomb.birthSolar || '—'}`, canvas.width / 2, yCursor + 82);

  ctx.fillStyle = '#fde68a';
  ctx.font = 'italic 25px "Times New Roman", serif';
  ctx.fillText(`(Tức Âm lịch: ${tomb.birthLunar || '—'})`, canvas.width / 2, yCursor + 118);

  yCursor += 156;

  // 6. Death Dates: TẠ THẾ / MẤT NGÀY (Dương Lịch + Âm Lịch)
  ctx.fillStyle = 'rgba(255, 216, 107, 0.08)';
  ctx.fillRect(boxLeft, yCursor, boxWidth, 132);
  ctx.strokeStyle = 'rgba(255, 216, 107, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(boxLeft, yCursor, boxWidth, 132);

  ctx.fillStyle = goldColor;
  ctx.font = 'bold 25px "Times New Roman", serif';
  ctx.fillText('✦ TẠ THẾ (DƯƠNG LỊCH & ÂM LỊCH) ✦', canvas.width / 2, yCursor + 36);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 28px "Times New Roman", serif';
  ctx.fillText(`Dương lịch: ${tomb.deathSolar || '—'}`, canvas.width / 2, yCursor + 76);

  ctx.fillStyle = '#fde68a';
  ctx.font = 'italic 25px "Times New Roman", serif';
  ctx.fillText(`(Nhằm Âm lịch: ${tomb.deathLunar || '—'})`, canvas.width / 2, yCursor + 112);

  yCursor += 156;

  // 7. HƯỞNG THỌ / HƯỞNG DƯƠNG Plaque (Prominent Gold-Framed Seal)
  const longevityLabel =
    tomb.longevityType === 'huong-duong'
      ? 'HƯỞNG DƯƠNG'
      : tomb.longevityType === 'huong-nien'
      ? 'HƯỞNG NIÊN'
      : 'HƯỞNG THỌ';

  ctx.fillStyle = 'rgba(212, 175, 55, 0.2)';
  ctx.fillRect(110, yCursor, canvas.width - 220, 74);
  ctx.strokeStyle = goldColor;
  ctx.lineWidth = 3.5;
  ctx.strokeRect(110, yCursor, canvas.width - 220, 74);

  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 38px "Times New Roman", Georgia, serif';
  ctx.fillText(`${longevityLabel}: ${tomb.longevityAge || 80} TUỔI`, canvas.width / 2, yCursor + 50);

  yCursor += 98;

  // 8. Hometown (Nguyên Quán) & Epitaph (Lời Tưởng Niệm) & Erected By (Người Lập Bia)
  if (tomb.hometown) {
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '24px "Times New Roman", serif';
    ctx.fillText(`Nguyên quán: ${tomb.hometown}`, canvas.width / 2, yCursor);
    yCursor += 34;
  }

  if (tomb.epitaph) {
    ctx.fillStyle = '#fef08a';
    ctx.font = 'italic 22px "Times New Roman", serif';
    const epLines = wrapCanvasLines(ctx, `"${tomb.epitaph}"`, canvas.width - 140, 2);
    epLines.forEach((l) => {
      ctx.fillText(l, canvas.width / 2, yCursor);
      yCursor += 28;
    });
  }

  // Footer: Erected by & Plot Code
  ctx.fillStyle = goldColor;
  ctx.font = 'bold 22px "Times New Roman", serif';
  const footerLines = wrapCanvasLines(
    ctx,
    tomb.erectedBy || 'Gia quyến đồng phụng lập',
    canvas.width - 130,
    1
  );
  ctx.fillText(footerLines[0] || 'Gia quyến đồng phụng lập', canvas.width / 2, canvas.height - 86);

  ctx.fillStyle = 'rgba(255, 228, 150, 0.72)';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(`VỊ TRÍ LÔ MỘ: ${tomb.plotCode}`, canvas.width / 2, canvas.height - 56);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Procedural Empty Plot Number Plaque Texture
 */
function createEmptyPlotLabelTexture(slot: MemorialPlotSlot): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#10241d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 66px "Times New Roman", serif';
  ctx.fillText(`LÔ ${slot.plotCode}`, canvas.width / 2, 102);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('VỊ TRÍ TRỐNG • NHẤN ĐỂ ĐẶT MỘ', canvas.width / 2, 162);

  ctx.fillStyle = '#fde68a';
  ctx.font = '24px sans-serif';
  ctx.fillText(
    slot.plotFee > 0 ? `Phí đất: ${slot.plotFee.toLocaleString('vi-VN')} đ` : 'Đất công đức: 0 đ (Tùy tâm)',
    canvas.width / 2,
    208
  );

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Procedural Stone Surface Grain Texture
 */
function createStoneGrainTexture(baseHex: string, speckleHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 900; i++) {
    const x = (i * 73) % 256;
    const y = (i * 139) % 256;
    ctx.fillStyle = i % 3 === 0 ? speckleHex : 'rgba(255,255,255,0.06)';
    ctx.fillRect(x, y, (i % 3) + 1, (i % 3) + 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

/**
 * Build a multi-part 3D Tomb Monument Group (6 to 14 procedural sub-parts)
 */
function buildTombMonument3DGroup(
  tomb: MemorialTombRecord,
  isSelected: boolean,
  isBurningNow: boolean,
  maxAnisotropy: number,
  disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[]; textures: THREE.Texture[] },
  animatedRefs: {
    halos: THREE.Object3D[];
    emberTips: THREE.Mesh[];
    smokeOrigins: { x: number; y: number; z: number }[];
    worldPos: { x: number; z: number };
  }
): THREE.Group {
  const group = new THREE.Group();
  const matCfg =
    TOMB_MATERIAL_CATALOG.find((m) => m.id === tomb.materialId) || TOMB_MATERIAL_CATALOG[1];

  const stoneTex = createStoneGrainTexture(matCfg.baseColorHex, matCfg.accentColorHex);
  disposables.textures.push(stoneTex);

  const primaryStoneMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    roughness: matCfg.roughness,
    metalness: matCfg.metalness,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(matCfg.accentColorHex),
    roughness: 0.3,
    metalness: 0.7,
  });
  disposables.materials.push(primaryStoneMat, trimMat);

  // 1. Stepped Stone Foundation Tiers (Tam cấp Thiên - Địa - Nhân)
  const tier1Geo = new THREE.BoxGeometry(2.05, 0.18, 2.55);
  const tier1 = new THREE.Mesh(tier1Geo, primaryStoneMat);
  tier1.position.y = 0.09;
  group.add(tier1);

  const tier2Geo = new THREE.BoxGeometry(1.78, 0.2, 2.22);
  const tier2 = new THREE.Mesh(tier2Geo, primaryStoneMat);
  tier2.position.y = 0.28;
  group.add(tier2);

  const tier3Geo = new THREE.BoxGeometry(1.48, 0.24, 1.82);
  const tier3 = new THREE.Mesh(tier3Geo, primaryStoneMat);
  tier3.position.y = 0.5;
  group.add(tier3);

  // Gold/Accent trim bevel around middle tier
  const trimGeo = new THREE.BoxGeometry(1.81, 0.035, 2.25);
  const trimMesh = new THREE.Mesh(trimGeo, trimMat);
  trimMesh.position.y = 0.385;
  group.add(trimMesh);

  // Tomb Coffin Sarcophagus Body (Thân mộ đá)
  const bodyGeo = new THREE.BoxGeometry(1.16, 0.34, 1.15);
  const bodyMesh = new THREE.Mesh(bodyGeo, primaryStoneMat);
  bodyMesh.position.set(0, 0.78, -0.05);
  group.add(bodyMesh);

  // Lotus top cover on tomb body
  const topSlabGeo = new THREE.BoxGeometry(1.24, 0.07, 1.22);
  const topSlab = new THREE.Mesh(topSlabGeo, trimMat);
  topSlab.position.set(0, 0.98, -0.05);
  group.add(topSlab);

  disposables.geometries.push(tier1Geo, tier2Geo, tier3Geo, trimGeo, bodyGeo, topSlabGeo);

  // 2. Upright 3D Stele Frame & Engraved Stele Face (Bia Mộ 3D Khắc Chữ)
  const steleY = 1.48;
  const steleZ = -0.52;

  const steleBackGeo = new THREE.BoxGeometry(1.06, 1.34, 0.14);
  const steleBack = new THREE.Mesh(steleBackGeo, primaryStoneMat);
  steleBack.position.set(0, steleY, steleZ);
  group.add(steleBack);

  const steleBorderGeo = new THREE.BoxGeometry(1.12, 1.4, 0.11);
  const steleBorder = new THREE.Mesh(steleBorderGeo, trimMat);
  steleBorder.position.set(0, steleY, steleZ - 0.01);
  group.add(steleBorder);

  const steleTex = createTombSteleCanvasTexture(tomb, maxAnisotropy);
  disposables.textures.push(steleTex);

  const steleFaceGeo = new THREE.PlaneGeometry(0.98, 1.28);
  const steleFaceMat = new THREE.MeshBasicMaterial({
    map: steleTex,
  });
  const steleFace = new THREE.Mesh(steleFaceGeo, steleFaceMat);
  steleFace.position.set(0, steleY, steleZ + 0.076);
  group.add(steleFace);

  disposables.geometries.push(steleBackGeo, steleBorderGeo, steleFaceGeo);
  disposables.materials.push(steleFaceMat);

  // 3. Architecture Specific 3D Structures (Mái Đao, Bảo Tháp Liên Hoa, Lăng Mộ Hoàng Gia)
  const arch = tomb.architectureId;
  if (arch === 'mo_mai_dao_co' || arch === 'lang_mo_hoang_gia') {
    // 4 Carved Pillars around the Stele supporting Curved Vietnamese Temple Roof
    const pillarGeo = new THREE.CylinderGeometry(0.055, 0.065, 1.55, 12);
    disposables.geometries.push(pillarGeo);
    const pillarOffsets = [
      [-0.62, -0.82],
      [0.62, -0.82],
      [-0.62, -0.18],
      [0.62, -0.18],
    ];
    pillarOffsets.forEach(([px, pz]) => {
      const p = new THREE.Mesh(pillarGeo, primaryStoneMat);
      p.position.set(px, 1.38, pz);
      group.add(p);
    });

    // Curved Roof Tier 1
    const roof1Geo = new THREE.ConeGeometry(1.18, 0.42, 4);
    const roofMat = new THREE.MeshStandardMaterial({
      color: arch === 'lang_mo_hoang_gia' ? 0xb8860b : 0x5c261b,
      roughness: 0.35,
      metalness: arch === 'lang_mo_hoang_gia' ? 0.65 : 0.25,
    });
    const roof1 = new THREE.Mesh(roof1Geo, roofMat);
    roof1.position.set(0, 2.34, -0.5);
    roof1.rotation.y = Math.PI / 4;
    group.add(roof1);
    disposables.geometries.push(roof1Geo);
    disposables.materials.push(roofMat);

    if (arch === 'lang_mo_hoang_gia') {
      // Second Upper Pagoda Roof + Finial + Perimeter Carved Balustrade Posts
      const roof2Geo = new THREE.ConeGeometry(0.86, 0.38, 4);
      const roof2 = new THREE.Mesh(roof2Geo, roofMat);
      roof2.position.set(0, 2.72, -0.5);
      roof2.rotation.y = Math.PI / 4;
      group.add(roof2);

      const finialGeo = new THREE.SphereGeometry(0.1, 12, 12);
      const finial = new THREE.Mesh(finialGeo, trimMat);
      finial.position.set(0, 2.98, -0.5);
      group.add(finial);

      // Perimeter carved stone fence posts (Lan can đá lăng mộ)
      const postGeo = new THREE.BoxGeometry(0.1, 0.42, 0.1);
      const railCorners = [
        [-0.96, -1.2],
        [0.96, -1.2],
        [-0.96, 1.2],
        [0.96, 1.2],
        [-0.96, 0],
        [0.96, 0],
      ];
      railCorners.forEach(([rx, rz]) => {
        const post = new THREE.Mesh(postGeo, trimMat);
        post.position.set(rx, 0.38, rz);
        group.add(post);
      });

      const sideRailGeo = new THREE.BoxGeometry(0.05, 0.2, 2.4);
      const leftRail = new THREE.Mesh(sideRailGeo, primaryStoneMat);
      leftRail.position.set(-0.96, 0.28, 0);
      const rightRail = new THREE.Mesh(sideRailGeo, primaryStoneMat);
      rightRail.position.set(0.96, 0.28, 0);
      group.add(leftRail, rightRail);

      disposables.geometries.push(roof2Geo, finialGeo, postGeo, sideRailGeo);
    }
  } else if (arch === 'mo_thap_lien_hoa') {
    // Lotus Stupa Spire atop the Stele
    const lotusBaseGeo = new THREE.CylinderGeometry(0.45, 0.32, 0.22, 12);
    const lotusMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      roughness: 0.35,
      metalness: 0.2,
    });
    const lotusBase = new THREE.Mesh(lotusBaseGeo, lotusMat);
    lotusBase.position.set(0, 2.26, steleZ);
    group.add(lotusBase);

    const spireGeo = new THREE.ConeGeometry(0.24, 0.68, 12);
    const spire = new THREE.Mesh(spireGeo, trimMat);
    spire.position.set(0, 2.68, steleZ);
    group.add(spire);
    disposables.geometries.push(lotusBaseGeo, spireGeo);
    disposables.materials.push(lotusMat);
  }

  // 4. Incense Burner & 3 Glowing Incense Sticks (Đốt Nhang Tưởng Nhớ 3D)
  const addons = new Set(tomb.addons || ['lu_huong_da']);
  const urnGeo = new THREE.CylinderGeometry(0.16, 0.13, 0.2, 14);
  const urnMat = new THREE.MeshStandardMaterial({
    color: addons.has('lu_huong_da') ? 0xd4af37 : 0x64748b,
    roughness: 0.32,
    metalness: 0.72,
  });
  const urn = new THREE.Mesh(urnGeo, urnMat);
  urn.position.set(0, 0.72, 0.68);
  group.add(urn);
  disposables.geometries.push(urnGeo);
  disposables.materials.push(urnMat);

  // 3 Incense sticks inside burner
  const hasLitIncense = (tomb.incenseCount || 0) > 0 || isBurningNow;
  if (hasLitIncense) {
    const stickGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.34, 6);
    const stickMat = new THREE.MeshBasicMaterial({ color: 0x991b1b });
    const tipGeo = new THREE.SphereGeometry(isBurningNow ? 0.024 : 0.016, 8, 8);
    const tipMat = new THREE.MeshBasicMaterial({
      color: isBurningNow ? 0xff4500 : 0xff6b00,
    });
    disposables.geometries.push(stickGeo, tipGeo);
    disposables.materials.push(stickMat, tipMat);

    [-0.04, 0, 0.04].forEach((ox, idx) => {
      const st = new THREE.Mesh(stickGeo, stickMat);
      st.position.set(ox, 0.94, 0.68);
      st.rotation.z = (idx - 1) * 0.08;
      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.y = 0.17;
      st.add(tip);
      animatedRefs.emberTips.push(tip);
      group.add(st);
    });

    animatedRefs.smokeOrigins.push({
      x: animatedRefs.worldPos.x,
      y: 1.12,
      z: animatedRefs.worldPos.z + 0.68,
    });
  }

  // 5. Optional Purchased 3D Add-on Offerings
  if (addons.has('den_da')) {
    const lanternPostGeo = new THREE.CylinderGeometry(0.045, 0.06, 0.55, 8);
    const lanternCoreGeo = new THREE.BoxGeometry(0.16, 0.2, 0.16);
    const lanternRoofGeo = new THREE.ConeGeometry(0.18, 0.14, 4);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
    disposables.geometries.push(lanternPostGeo, lanternCoreGeo, lanternRoofGeo);
    disposables.materials.push(glowMat);

    [-0.72, 0.72].forEach((lx) => {
      const lGroup = new THREE.Group();
      const post = new THREE.Mesh(lanternPostGeo, primaryStoneMat);
      post.position.y = 0.65;
      const core = new THREE.Mesh(lanternCoreGeo, glowMat);
      core.position.y = 1.0;
      const roof = new THREE.Mesh(lanternRoofGeo, trimMat);
      roof.position.y = 1.16;
      roof.rotation.y = Math.PI / 4;
      lGroup.add(post, core, roof);
      lGroup.position.set(lx, 0, 0.78);
      group.add(lGroup);
    });
  }

  if (addons.has('binh_sen_ngoc')) {
    const vaseGeo = new THREE.CylinderGeometry(0.07, 0.05, 0.22, 10);
    const vaseMat = new THREE.MeshStandardMaterial({ color: 0xa7f3d0, roughness: 0.2, metalness: 0.1 });
    const bloomGeo = new THREE.DodecahedronGeometry(0.09, 0);
    const bloomMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.4 });
    disposables.geometries.push(vaseGeo, bloomGeo);
    disposables.materials.push(vaseMat, bloomMat);

    [-0.42, 0.42].forEach((vx) => {
      const vase = new THREE.Mesh(vaseGeo, vaseMat);
      vase.position.set(vx, 0.73, 0.58);
      const bloom = new THREE.Mesh(bloomGeo, bloomMat);
      bloom.position.set(vx, 0.9, 0.58);
      group.add(vase, bloom);
    });
  }

  if (addons.has('doi_hac_da')) {
    const turtleGeo = new THREE.SphereGeometry(0.11, 10, 8);
    const craneBodyGeo = new THREE.ConeGeometry(0.07, 0.42, 8);
    disposables.geometries.push(turtleGeo, craneBodyGeo);

    [-0.58, 0.58].forEach((cx) => {
      const turtle = new THREE.Mesh(turtleGeo, primaryStoneMat);
      turtle.scale.set(1, 0.55, 1.3);
      turtle.position.set(cx, 0.66, 0.25);
      const crane = new THREE.Mesh(craneBodyGeo, trimMat);
      crane.position.set(cx, 0.96, 0.25);
      group.add(turtle, crane);
    });
  }

  if (addons.has('cay_tung_bonsai')) {
    const trunkGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.5, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.9 });
    const foliageGeo = new THREE.SphereGeometry(0.24, 10, 8);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 });
    disposables.geometries.push(trunkGeo, foliageGeo);
    disposables.materials.push(trunkMat, foliageMat);

    [-1.08, 1.08].forEach((tx) => {
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(tx, 0.35, -0.35);
      const crown = new THREE.Mesh(foliageGeo, foliageMat);
      crown.scale.set(1.1, 0.75, 1.1);
      crown.position.set(tx, 0.68, -0.35);
      group.add(trunk, crown);
    });
  }

  if (addons.has('hao_quang_phat')) {
    const haloGeo = new THREE.TorusGeometry(0.72, 0.03, 12, 48);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.85,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.position.set(0, steleY + 0.15, steleZ - 0.12);
    group.add(haloMesh);
    animatedRefs.halos.push(haloMesh);
    disposables.geometries.push(haloGeo);
    disposables.materials.push(haloMat);
  }

  // Selection golden ring highlight on ground
  if (isSelected) {
    const selGeo = new THREE.RingGeometry(1.38, 1.52, 36);
    const selMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const selRing = new THREE.Mesh(selGeo, selMat);
    selRing.rotation.x = -Math.PI / 2;
    selRing.position.y = 0.03;
    group.add(selRing);
    disposables.geometries.push(selGeo);
    disposables.materials.push(selMat);
  }

  return group;
}

export const MemorialPark3DCanvas: React.FC<MemorialPark3DCanvasProps> = ({
  tombs,
  selectedPlotCode,
  previewDraftTomb = null,
  burningPlotCode = null,
  timeOfDay = 'dusk',
  cameraViewMode = 'overview',
  onSelectTomb,
  onSelectEmptyPlot,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const onSelectTombRef = useRef(onSelectTomb);
  const onSelectEmptyPlotRef = useRef(onSelectEmptyPlot);
  onSelectTombRef.current = onSelectTomb;
  onSelectEmptyPlotRef.current = onSelectEmptyPlot;

  // Persistent camera animation targets across prop updates
  const sceneCtxRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    plotsRoot: THREE.Group;
    maxAnisotropy: number;
    desiredCamPos: THREE.Vector3;
    desiredTarget: THREE.Vector3;
    isGliding: boolean;
    halos: THREE.Object3D[];
    emberTips: THREE.Mesh[];
    smokeOrigins: { x: number; y: number; z: number }[];
    interactivePlots: Map<string, { object: THREE.Object3D; tomb?: MemorialTombRecord; slot: MemorialPlotSlot }>;
    plotDisposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[]; textures: THREE.Texture[] };
    ambientLight: THREE.AmbientLight;
    sunLight: THREE.DirectionalLight;
  } | null>(null);

  // 1. Initialize core WebGL Scene, Shrine Pavilion, Pathways, Ponds & Trees ONCE
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 540;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 140);
    camera.position.set(0, 7.8, 15.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|Software|Microsoft Basic Render/i.test(rendererStr);

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isSoftwareGl;
    container.appendChild(renderer.domElement);

    // Procedural PBR Environment via RoomEnvironment
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 2.1;
    controls.maxDistance = 28;
    controls.target.set(0, 1.0, -0.5);

    const staticGeos: THREE.BufferGeometry[] = [];
    const staticMats: THREE.Material[] = [];
    const staticTextures: THREE.Texture[] = [];

    // Lights
    const ambientLight = new THREE.AmbientLight(0xfff4dc, 0.85);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffdf9e, 1.55);
    sunLight.position.set(9, 16, 10);
    scene.add(sunLight);

    const shrineGlow = new THREE.PointLight(0xffb74d, 2.4, 14);
    shrineGlow.position.set(0, 2.6, -9.2);
    scene.add(shrineGlow);

    // Park Ground Lawn & Central Stone Avenue
    const groundGeo = new THREE.PlaneGeometry(46, 44);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x162b22, roughness: 0.92, metalness: 0.04 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const roadGeo = new THREE.BoxGeometry(2.9, 0.05, 23);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.72, metalness: 0.12 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.position.set(0, 0.025, 0.5);
    scene.add(road);

    // Cross walkways between tomb rows
    [-4.6, -1.0, 2.6, 6.2].forEach((rz) => {
      const rowWalkGeo = new THREE.BoxGeometry(19.2, 0.03, 0.65);
      const rowWalk = new THREE.Mesh(rowWalkGeo, roadMat);
      rowWalk.position.set(0, 0.015, rz + 1.48);
      scene.add(rowWalk);
      staticGeos.push(rowWalkGeo);
    });

    staticGeos.push(groundGeo, roadGeo);
    staticMats.push(groundMat, roadMat);

    // North Landmark: Đài Tưởng Niệm Địa Tạng Vương Bồ Tát (Multi-part 3D Shrine Pavilion)
    const shrineGroup = new THREE.Group();
    shrineGroup.position.set(0, 0, -9.8);

    const terraceMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.2 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.25, metalness: 0.8 });
    const redWoodMat = new THREE.MeshStandardMaterial({ color: 0x6b1d1d, roughness: 0.45, metalness: 0.2 });
    const roofTileMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.4, metalness: 0.35 });
    staticMats.push(terraceMat, goldMat, redWoodMat, roofTileMat);

    const shBase1Geo = new THREE.BoxGeometry(7.2, 0.35, 4.4);
    const shBase1 = new THREE.Mesh(shBase1Geo, terraceMat);
    shBase1.position.y = 0.175;
    const shBase2Geo = new THREE.BoxGeometry(5.8, 0.35, 3.6);
    const shBase2 = new THREE.Mesh(shBase2Geo, terraceMat);
    shBase2.position.y = 0.52;
    shrineGroup.add(shBase1, shBase2);

    const shColGeo = new THREE.CylinderGeometry(0.14, 0.16, 2.8, 12);
    [
      [-2.2, -1.2],
      [2.2, -1.2],
      [-2.2, 1.2],
      [2.2, 1.2],
    ].forEach(([cx, cz]) => {
      const col = new THREE.Mesh(shColGeo, redWoodMat);
      col.position.set(cx, 2.05, cz);
      shrineGroup.add(col);
    });

    const shRoof1Geo = new THREE.ConeGeometry(4.1, 1.05, 4);
    const shRoof1 = new THREE.Mesh(shRoof1Geo, roofTileMat);
    shRoof1.position.y = 3.9;
    shRoof1.rotation.y = Math.PI / 4;
    const shRoof2Geo = new THREE.ConeGeometry(2.8, 0.9, 4);
    const shRoof2 = new THREE.Mesh(shRoof2Geo, roofTileMat);
    shRoof2.position.y = 4.75;
    shRoof2.rotation.y = Math.PI / 4;
    shrineGroup.add(shRoof1, shRoof2);

    // ==========================================
    // TÔN TƯỢNG THẬT ĐẠI NGUYỆN ĐỊA TẠNG VƯƠNG BỒ TÁT (REAL 3D PHOTOREALISTIC BODHISATTVA STATUE)
    // ==========================================
    const texLoader = new THREE.TextureLoader();
    const diaTangRealTex = texLoader.load('/assets/aistudio/_aiiatang_4950003d.jfif');
    diaTangRealTex.colorSpace = THREE.SRGBColorSpace;
    staticTextures.push(diaTangRealTex);

    // Multi-tier Lotus Throne & Pedestal
    const pedestalGeo = new THREE.CylinderGeometry(0.85, 1.05, 0.38, 24);
    const pedestal = new THREE.Mesh(pedestalGeo, goldMat);
    pedestal.position.y = 0.88;
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    shrineGroup.add(pedestal);

    const pedestalTier2Geo = new THREE.CylinderGeometry(0.72, 0.88, 0.28, 24);
    const pedestalTier2 = new THREE.Mesh(pedestalTier2Geo, goldMat);
    pedestalTier2.position.y = 1.18;
    shrineGroup.add(pedestalTier2);

    // Sculpted golden lotus petals around throne
    const petalGeo = new THREE.ConeGeometry(0.12, 0.36, 5);
    staticGeos.push(petalGeo);
    for (let p = 0; p < 16; p++) {
      const angle = (p / 16) * Math.PI * 2;
      const petal = new THREE.Mesh(petalGeo, goldMat);
      petal.position.set(Math.cos(angle) * 0.88, 1.15, Math.sin(angle) * 0.88);
      petal.rotation.x = Math.PI / 4;
      petal.rotation.y = angle;
      shrineGroup.add(petal);
    }

    // Authentic Photorealistic Bodhisattva Ksitigarbha Statue Plane
    const dtWidth = 1.9;
    const dtHeight = 2.65;
    const dtStatueGeo = new THREE.PlaneGeometry(dtWidth, dtHeight);
    const dtStatueMat = new THREE.MeshStandardMaterial({
      map: diaTangRealTex,
      roughness: 0.25,
      metalness: 0.25,
      side: THREE.DoubleSide,
    });
    const dtStatueMesh = new THREE.Mesh(dtStatueGeo, dtStatueMat);
    dtStatueMesh.position.set(0, 2.45, 0.05);
    dtStatueMesh.castShadow = true;
    shrineGroup.add(dtStatueMesh);

    // Realistic gold backing giving the Bodhisattva solid 3D depth and thickness
    const dtBackingGeo = new THREE.BoxGeometry(dtWidth + 0.08, dtHeight + 0.08, 0.12);
    const dtBacking = new THREE.Mesh(dtBackingGeo, goldMat);
    dtBacking.position.set(0, 2.45, -0.02);
    dtBacking.castShadow = true;
    shrineGroup.add(dtBacking);

    // Golden Khakkhara Staff (Tích Trượng 12 khoen vàng thức tỉnh u minh)
    const staffGeo = new THREE.CylinderGeometry(0.022, 0.022, 2.9, 8);
    const staff = new THREE.Mesh(staffGeo, goldMat);
    staff.position.set(0.68, 2.45, 0.18);
    shrineGroup.add(staff);

    // Radiant Golden Halo
    const shHaloGeo = new THREE.TorusGeometry(1.05, 0.045, 16, 48);
    const shHaloMat = new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.9 });
    const shHalo = new THREE.Mesh(shHaloGeo, shHaloMat);
    shHalo.position.set(0, 2.95, -0.09);
    shrineGroup.add(shHalo);

    // Radiating Sunburst Disc
    const sunburstGeo = new THREE.CircleGeometry(1.0, 32);
    const sunburstMat = new THREE.MeshBasicMaterial({
      color: 0xffc44d,
      transparent: true,
      opacity: 0.26,
      side: THREE.DoubleSide,
    });
    const sunburst = new THREE.Mesh(sunburstGeo, sunburstMat);
    sunburst.position.set(0, 2.95, -0.11);
    shrineGroup.add(sunburst);

    // Warm golden spiritual light from Bodhisattva
    const dtAuraLight = new THREE.PointLight(0xffb84d, 2.2, 7.5);
    dtAuraLight.position.set(0, 2.65, 0.7);
    shrineGroup.add(dtAuraLight);

    // Pavilion Signboard Plaque: "NAM MÔ ĐỊA TẠNG VƯƠNG BỒ TÁT"
    const plaqueTex = createSignCanvasTexture('ĐỊA TẠNG VƯƠNG', 'ĐẠI NGUYỆN CỨU ĐỘ TRẦM LUÂN');
    staticTextures.push(plaqueTex);
    const plaqueMat = new THREE.MeshStandardMaterial({
      map: plaqueTex,
      roughness: 0.35,
      metalness: 0.15,
    });
    const plaqueGeo = new THREE.BoxGeometry(3.2, 0.82, 0.08);
    const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
    plaqueMesh.position.set(0, 3.45, 1.4);
    shrineGroup.add(plaqueMesh);

    // Great Bronze Incense Cauldron in front of Shrine
    const cauldronGeo = new THREE.CylinderGeometry(0.52, 0.42, 0.6, 20);
    const cauldron = new THREE.Mesh(cauldronGeo, goldMat);
    cauldron.position.set(0, 0.98, 1.65);
    cauldron.castShadow = true;
    shrineGroup.add(cauldron);

    // Incense sticks in cauldron
    [-0.07, 0, 0.07].forEach((ix) => {
      const stGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.55, 6);
      const stMat = new THREE.MeshBasicMaterial({ color: 0x991b1b });
      const stick = new THREE.Mesh(stGeo, stMat);
      stick.position.set(ix, 1.45, 1.65);
      const tipGeo = new THREE.SphereGeometry(0.02, 6, 6);
      const tipMat = new THREE.MeshBasicMaterial({ color: 0xff3b00 });
      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.y = 0.28;
      stick.add(tip);
      shrineGroup.add(stick);
      staticGeos.push(stGeo, tipGeo);
      staticMats.push(stMat, tipMat);
    });

    scene.add(shrineGroup);
    staticGeos.push(
      shBase1Geo,
      shBase2Geo,
      shColGeo,
      shRoof1Geo,
      shRoof2Geo,
      pedestalGeo,
      pedestalTier2Geo,
      dtStatueGeo,
      dtBackingGeo,
      staffGeo,
      shHaloGeo,
      sunburstGeo,
      plaqueGeo,
      cauldronGeo
    );
    staticMats.push(dtStatueMat, shHaloMat, sunburstMat, plaqueMat);

    // Perimeter Cypress & Apricot Trees
    const treeTrunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.4, 8);
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x452c1e, roughness: 0.9 });
    const pineCrownGeo = new THREE.ConeGeometry(0.85, 2.4, 9);
    const pineCrownMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8 });
    staticGeos.push(treeTrunkGeo, pineCrownGeo);
    staticMats.push(treeTrunkMat, pineCrownMat);

    const treeCoords = [
      [-11.2, -8.5],
      [11.2, -8.5],
      [-11.5, -3.5],
      [11.5, -3.5],
      [-11.5, 1.5],
      [11.5, 1.5],
      [-11.5, 6.5],
      [11.5, 6.5],
      [-5.2, -9.8],
      [5.2, -9.8],
    ];
    treeCoords.forEach(([tx, tz]) => {
      const tGroup = new THREE.Group();
      const tr = new THREE.Mesh(treeTrunkGeo, treeTrunkMat);
      tr.position.y = 0.7;
      const cr = new THREE.Mesh(pineCrownGeo, pineCrownMat);
      cr.position.y = 2.2;
      tGroup.add(tr, cr);
      tGroup.position.set(tx, 0, tz);
      scene.add(tGroup);
    });

    // Global Rising Incense Smoke Particle System (shared across Shrine & Lit Tombs)
    const smokeParticleCount = isSoftwareGl ? 60 : 140;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePos = new Float32Array(smokeParticleCount * 3);
    const smokeMeta: { progress: number; speed: number; drift: number; sourceIdx: number }[] = [];
    for (let i = 0; i < smokeParticleCount; i++) {
      smokePos[i * 3] = 0;
      smokePos[i * 3 + 1] = -20;
      smokePos[i * 3 + 2] = 0;
      smokeMeta.push({
        progress: Math.random(),
        speed: 0.004 + Math.random() * 0.005,
        drift: (Math.random() - 0.5) * 0.45,
        sourceIdx: i,
      });
    }
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
    const smokeMat = new THREE.PointsMaterial({
      color: 0xe2e8f0,
      size: 0.14,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    const smokePoints = new THREE.Points(smokeGeo, smokeMat);
    scene.add(smokePoints);
    staticGeos.push(smokeGeo);
    staticMats.push(smokeMat);

    // Dynamic Plots Container
    const plotsRoot = new THREE.Group();
    scene.add(plotsRoot);

    const ctxObj = {
      scene,
      camera,
      controls,
      plotsRoot,
      maxAnisotropy,
      desiredCamPos: new THREE.Vector3(0, 7.8, 15.8),
      desiredTarget: new THREE.Vector3(0, 1.0, -0.5),
      isGliding: false,
      halos: [shHalo] as THREE.Object3D[],
      emberTips: [] as THREE.Mesh[],
      smokeOrigins: [{ x: 0, y: 1.35, z: -8.15 }],
      interactivePlots: new Map<
        string,
        { object: THREE.Object3D; tomb?: MemorialTombRecord; slot: MemorialPlotSlot }
      >(),
      plotDisposables: {
        geometries: [] as THREE.BufferGeometry[],
        materials: [] as THREE.Material[],
        textures: [] as THREE.Texture[],
      },
      ambientLight,
      sunLight,
    };
    sceneCtxRef.current = ctxObj;

    // Cancel camera auto-glide if user manually orbits
    const onControlStart = () => {
      ctxObj.isGliding = false;
    };
    controls.addEventListener('start', onControlStart);

    // Pointer Click Raycasting (Distinguish click vs orbit drag)
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (dist > 12) return; // Was an orbit drag, not a click

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(plotsRoot.children, true);
      if (hits.length > 0) {
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj && !obj.userData?.plotCode) {
          obj = obj.parent;
        }
        const code = obj?.userData?.plotCode;
        if (code && ctxObj.interactivePlots.has(code)) {
          const entry = ctxObj.interactivePlots.get(code)!;
          if (entry.tomb) {
            onSelectTombRef.current(entry.tomb);
          } else {
            onSelectEmptyPlotRef.current(entry.slot);
          }
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(plotsRoot.children, true);
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    // ResizeObserver
    const ro = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    // Render Loop (with software-GL safe frame pacing)
    let disposed = false;
    let rafId = 0;
    let timerId = 0;
    const clock = new THREE.Clock();

    const afterDraw = isSoftwareGl
      ? (cb: () => void) => {
          timerId = window.setTimeout(() => {
            rafId = requestAnimationFrame(cb);
          }, 16);
        }
      : (cb: () => void) => {
          rafId = requestAnimationFrame(cb);
        };

    const tick = () => {
      if (disposed) return;
      const elapsed = clock.getElapsedTime();

      if (ctxObj.isGliding) {
        camera.position.lerp(ctxObj.desiredCamPos, 0.08);
        controls.target.lerp(ctxObj.desiredTarget, 0.08);
        if (
          camera.position.distanceTo(ctxObj.desiredCamPos) < 0.06 &&
          controls.target.distanceTo(ctxObj.desiredTarget) < 0.06
        ) {
          ctxObj.isGliding = false;
        }
      }

      // Gentle halo rotation & ember glow
      for (const h of ctxObj.halos) {
        h.rotation.z = elapsed * 0.35;
      }
      const emberScale = 1 + Math.sin(elapsed * 5.5) * 0.16;
      for (const tip of ctxObj.emberTips) {
        tip.scale.setScalar(emberScale);
      }

      // Update rising incense smoke particles across all active incense burners
      const origins = ctxObj.smokeOrigins;
      const posAttr = smokeGeo.getAttribute('position') as THREE.BufferAttribute;
      if (origins.length > 0) {
        for (let i = 0; i < smokeParticleCount; i++) {
          const m = smokeMeta[i];
          m.progress += m.speed;
          if (m.progress >= 1) m.progress = 0;
          const src = origins[i % origins.length];
          const py = src.y + m.progress * 1.65;
          const px = src.x + Math.sin(elapsed * 1.4 + i) * 0.08 * m.progress + m.drift * m.progress;
          const pz = src.z + Math.cos(elapsed * 1.2 + i) * 0.06 * m.progress;
          posAttr.setXYZ(i, px, py, pz);
        }
        posAttr.needsUpdate = true;
      }

      controls.update();
      renderer.render(scene, camera);
      afterDraw(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      ro.disconnect();
      controls.removeEventListener('start', onControlStart);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      controls.dispose();
      envTex.dispose();

      ctxObj.plotDisposables.geometries.forEach((g) => g.dispose());
      ctxObj.plotDisposables.materials.forEach((m) => m.dispose());
      ctxObj.plotDisposables.textures.forEach((t) => t.dispose());
      staticGeos.forEach((g) => g.dispose());
      staticMats.forEach((m) => m.dispose());
      staticTextures.forEach((t) => t.dispose());

      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      sceneCtxRef.current = null;
    };
  }, []);

  // 2. Sync Time of Day Atmosphere
  useEffect(() => {
    const ctxObj = sceneCtxRef.current;
    if (!ctxObj) return;
    if (timeOfDay === 'day') {
      ctxObj.scene.background = new THREE.Color(0x1e3a4c);
      ctxObj.scene.fog = new THREE.FogExp2(0x1e3a4c, 0.018);
      ctxObj.ambientLight.intensity = 1.15;
      ctxObj.sunLight.intensity = 1.85;
      ctxObj.sunLight.color.setHex(0xfffbeb);
    } else if (timeOfDay === 'night') {
      ctxObj.scene.background = new THREE.Color(0x060b16);
      ctxObj.scene.fog = new THREE.FogExp2(0x060b16, 0.024);
      ctxObj.ambientLight.intensity = 0.55;
      ctxObj.sunLight.intensity = 0.7;
      ctxObj.sunLight.color.setHex(0x93c5fd);
    } else {
      ctxObj.scene.background = new THREE.Color(0x1c1624);
      ctxObj.scene.fog = new THREE.FogExp2(0x1c1624, 0.021);
      ctxObj.ambientLight.intensity = 0.88;
      ctxObj.sunLight.intensity = 1.45;
      ctxObj.sunLight.color.setHex(0xffcf7d);
    }
  }, [timeOfDay]);

  // 3. Rebuild 24 3D Plots whenever tombs, previewDraftTomb, selectedPlotCode, or burningPlotCode changes
  useEffect(() => {
    const ctxObj = sceneCtxRef.current;
    if (!ctxObj) return;

    // Dispose previous plot meshes/textures cleanly
    while (ctxObj.plotsRoot.children.length > 0) {
      ctxObj.plotsRoot.remove(ctxObj.plotsRoot.children[0]);
    }
    ctxObj.plotDisposables.geometries.forEach((g) => g.dispose());
    ctxObj.plotDisposables.materials.forEach((m) => m.dispose());
    ctxObj.plotDisposables.textures.forEach((t) => t.dispose());
    ctxObj.plotDisposables = { geometries: [], materials: [], textures: [] };
    ctxObj.interactivePlots.clear();
    ctxObj.halos = ctxObj.halos.slice(0, 1); // keep shrine halo
    ctxObj.emberTips = [];
    ctxObj.smokeOrigins = [{ x: 0, y: 1.35, z: -8.15 }]; // keep shrine cauldron smoke

    const tombByPlot = new Map<string, MemorialTombRecord>();
    for (const t of tombs) {
      tombByPlot.set(t.plotCode.toUpperCase(), t);
    }
    if (previewDraftTomb && previewDraftTomb.plotCode) {
      tombByPlot.set(previewDraftTomb.plotCode.toUpperCase(), previewDraftTomb);
    }

    const emptyCurbGeo = new THREE.BoxGeometry(2.05, 0.1, 2.55);
    const emptyLawnGeo = new THREE.BoxGeometry(1.85, 0.12, 2.35);
    const emptyPlaqueGeo = new THREE.PlaneGeometry(1.35, 0.68);
    const emptyHitboxGeo = new THREE.BoxGeometry(2.15, 0.9, 2.65);
    const emptyHitboxMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    ctxObj.plotDisposables.geometries.push(
      emptyCurbGeo,
      emptyLawnGeo,
      emptyPlaqueGeo,
      emptyHitboxGeo
    );
    ctxObj.plotDisposables.materials.push(emptyHitboxMat);

    for (const slot of MEMORIAL_PLOT_SLOTS) {
      const world = getPlotWorldCoords(slot.rowIndex, slot.colIndex);
      const isSelected = selectedPlotCode?.toUpperCase() === slot.plotCode.toUpperCase();
      const occupiedTomb = tombByPlot.get(slot.plotCode.toUpperCase());

      if (occupiedTomb) {
        const tombGroup = buildTombMonument3DGroup(
          occupiedTomb,
          isSelected,
          burningPlotCode?.toUpperCase() === slot.plotCode.toUpperCase(),
          ctxObj.maxAnisotropy,
          ctxObj.plotDisposables,
          {
            halos: ctxObj.halos,
            emberTips: ctxObj.emberTips,
            smokeOrigins: ctxObj.smokeOrigins,
            worldPos: world,
          }
        );
        tombGroup.position.set(world.x, 0, world.z);
        tombGroup.userData = { plotCode: slot.plotCode };
        ctxObj.plotsRoot.add(tombGroup);
        ctxObj.interactivePlots.set(slot.plotCode, {
          object: tombGroup,
          tomb: occupiedTomb,
          slot,
        });
      } else {
        // Available Empty Plot in 3D
        const plotGroup = new THREE.Group();
        const curbMat = new THREE.MeshStandardMaterial({
          color: isSelected ? 0xfbbf24 : 0x475569,
          roughness: 0.7,
        });
        const lawnMat = new THREE.MeshStandardMaterial({
          color: isSelected ? 0x065f46 : 0x143829,
          roughness: 0.85,
        });
        const labelTex = createEmptyPlotLabelTexture(slot);
        const labelMat = new THREE.MeshBasicMaterial({ map: labelTex });

        ctxObj.plotDisposables.materials.push(curbMat, lawnMat, labelMat);
        ctxObj.plotDisposables.textures.push(labelTex);

        const curb = new THREE.Mesh(emptyCurbGeo, curbMat);
        curb.position.y = 0.05;
        const lawn = new THREE.Mesh(emptyLawnGeo, lawnMat);
        lawn.position.y = 0.065;

        // Angled 3D Stone Marker Plaque
        const plaque = new THREE.Mesh(emptyPlaqueGeo, labelMat);
        plaque.position.set(0, 0.36, 0);
        plaque.rotation.x = -0.45;

        // Invisible generous raycast volume so clicking anywhere on an empty plot opens Lập Mộ Mới
        const hitbox = new THREE.Mesh(emptyHitboxGeo, emptyHitboxMat);
        hitbox.position.y = 0.45;

        plotGroup.add(curb, lawn, plaque, hitbox);
        plotGroup.position.set(world.x, 0, world.z);
        plotGroup.userData = { plotCode: slot.plotCode };
        ctxObj.plotsRoot.add(plotGroup);
        ctxObj.interactivePlots.set(slot.plotCode, {
          object: plotGroup,
          slot,
        });
      }
    }
  }, [tombs, previewDraftTomb, selectedPlotCode, burningPlotCode]);

  // 4. Camera Glide to Selected Tomb / Plot or Overview
  useEffect(() => {
    const ctxObj = sceneCtxRef.current;
    if (!ctxObj) return;

    if (cameraViewMode === 'overview' || !selectedPlotCode) {
      ctxObj.desiredCamPos.set(0, 7.8, 15.8);
      ctxObj.desiredTarget.set(0, 1.0, -0.5);
      ctxObj.isGliding = true;
      return;
    }

    const slot = MEMORIAL_PLOT_SLOTS.find(
      (s) => s.plotCode.toUpperCase() === selectedPlotCode.toUpperCase()
    );
    if (slot) {
      const world = getPlotWorldCoords(slot.rowIndex, slot.colIndex);
      ctxObj.desiredCamPos.set(world.x, 1.92, world.z + 2.85);
      ctxObj.desiredTarget.set(world.x, 1.32, world.z - 0.35);
      ctxObj.isGliding = true;
    }
  }, [selectedPlotCode, cameraViewMode]);

  return <div ref={mountRef} className={`relative overflow-hidden select-none ${className}`} />;
};
