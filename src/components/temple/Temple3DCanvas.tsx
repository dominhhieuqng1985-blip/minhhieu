import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Compass,
  Footprints,
  Volume2,
  VolumeX,
  Sparkles,
  ShoppingBag,
  Bell,
  Eye,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  HelpCircle,
} from 'lucide-react';
import { speakViaStudioVoiceApi, stopSpeaking } from '../../utils/buddhistAudio';
import { MINH_HIEU_LE_CHUA_VOICE_ID } from '../../utils/everai';

export interface TempleHallInfo {
  id: string;
  name: string;
  title: string;
  coord: { x: number; z: number };
  description: string;
  statueName: string;
  icon: string;
  speechText: string;
}

/**
 * Creates dynamic high-resolution calligraphy canvas textures for pagoda signboards (Hoành phi)
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
    ctx.font = 'bold 48px "Times New Roman", "Palatino Linotype", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 6;
    ctx.fillText(title, 256, sub ? 56 : 70);

    if (sub) {
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(sub, 256, 106);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates dynamic calligraphy canvas textures for vertical temple couplets (Câu đối sơn son)
 */
function createCoupletCanvasTexture(chars: string[]): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#3a0808';
    ctx.fillRect(0, 0, 128, 512);

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 120, 504);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 30px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 4;

    const step = 440 / Math.max(chars.length, 1);
    chars.forEach((char, idx) => {
      ctx.fillText(char, 64, 52 + idx * step);
    });
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const TEMPLE_HALLS: TempleHallInfo[] = [
  {
    id: 'cong-tam-quan',
    name: 'Cổng Tam Quan Uy Nghiêm',
    title: 'Cổng Tam Quan • Đại Bi Cổ Tự',
    coord: { x: 0, z: 14 },
    description: 'Cổng Tam Quan 3 lối đi tượng trưng Tam Giải Thoát Môn (Không Môn, Vô Tướng Môn, Vô Tác Môn). Mái ngói vảy cá 2 tầng chồng diêm cổ kính, hoành phi thếp vàng "ĐẠI BI CỔ TỰ", câu đối sơn son, cặp sư tử đá uy nghi và đèn lồng đỏ đón khách thập phương.',
    statueName: 'Hộ Pháp Vi Đà & Tiêu Diện Đại Sĩ',
    icon: '⛩️',
    speechText: 'Nam Mô A Di Đà Phật. Kính chào quý Phật tử đã bước chân qua Cổng Tam Quan Đại Bi Cổ Tự. Nguyện cầu thân tâm an lạc, trút bỏ mọi muộn phiền nơi cõi trần.',
  },
  {
    id: 'chanh-dien',
    name: 'Đại Hùng Bảo Điện (Chánh Điện)',
    title: 'Chánh Điện • Phật Thích Ca Mâu Ni',
    coord: { x: 0, z: 0 },
    description: 'Chánh điện uy nghiêm bậc nhất, thờ Phật Thích Ca Mâu Ni ngự trên đài sen tam cấp thếp vàng rực rỡ cùng hào quang chiếu diệu.',
    statueName: 'Đức Bổn Sư Thích Ca Mâu Ni Phật',
    icon: '🪷',
    speechText: 'Nam Mô Bổn Sư Thích Ca Mâu Ni Phật. Trước mắt quý Phật tử là Đại Hùng Bảo Điện trang nghiêm, nơi tôn trí kim thân Đức Bổn Sư trên bảo đài sen vàng tỏa sáng muôn phương.',
  },
  {
    id: 'dien-quan-am',
    name: 'Điện Bồ Tát Quán Thế Âm',
    title: 'Quan Âm Các • Bồ Tát Từ Bi',
    coord: { x: -8, z: 2 },
    description: 'Điện Quan Âm lộ thiên với hồ sen và tôn tượng Mẹ Từ Bi tay cầm nhành dương liễu và bình tịnh thủy rưới mát cõi lòng.',
    statueName: 'Đại Bi Quán Thế Âm Bồ Tát',
    icon: '🕊️',
    speechText: 'Nam Mô Đại Bi Quán Thế Âm Bồ Tát. Quý vị đang diện kiến tôn tượng Bồ Tát Quán Thế Âm, tay cầm nhành dương liễu và bình tịnh thủy cam lộ rưới tắt mọi khổ đau nhân gian.',
  },
  {
    id: 'dien-dia-tang',
    name: 'Điện Đại Nguyện Địa Tạng Vương',
    title: 'Địa Tạng Điện • Cứu Độ U Minh',
    coord: { x: 8, z: 2 },
    description: 'Nơi thờ Bồ Tát Địa Tạng Vương thủ trì tích trượng 12 khoen và như ý châu, đại nguyện độ tận chúng sinh nơi u minh khổ ải.',
    statueName: 'Đại Nguyện Địa Tạng Vương Bồ Tát',
    icon: '⚜️',
    speechText: 'Nam Mô Đại Nguyện Địa Tạng Vương Bồ Tát. Địa ngục vị không, thệ bất thành Phật. Nơi đây quý vị có thể thắp hương cầu siêu cho cửu huyền thất tổ vãng sanh tịnh độ.',
  },
  {
    id: 'vuon-la-han',
    name: 'Vườn Thập Bát La Hán',
    title: 'Vườn La Hán • 18 Vị Tôn Giả',
    coord: { x: -5, z: 6 },
    description: '18 tôn tượng Thập Bát La Hán tạc bằng đá cẩm thạch trắng thanh tịnh, tọa thiền dọc hai bên lối đi rợp bóng bồ đề xanh mát.',
    statueName: 'Thập Bát La Hán Tôn Giả',
    icon: '🗿',
    speechText: 'Nam Mô Thập Bát La Hán Tôn Giả. Mời quý Phật tử tản bộ chiêm bái 18 vị đại đệ tử của Đức Phật, mỗi vị tiêu biểu cho một hạnh đức phi thường và giải thoát giác ngộ.',
  },
  {
    id: 'thap-chuong',
    name: 'Tháp Đại Hồng Chung & Gác Trống',
    title: 'Tháp Chuông • Đại Hồng Chung',
    coord: { x: -8, z: -5 },
    description: 'Đại hồng chung đúc bằng đồng thiêng cổ kính, tiếng chuông ngân nga thức tỉnh trần tâm muôn cõi u minh.',
    statueName: 'Đại Hồng Chung & Trống Bát Nhã',
    icon: '🔔',
    speechText: 'Văn chung thanh, phiền não khinh, trí tuệ trưởng, bồ đề sanh. Tiếng chuông chùa ngân nga xua tan mọi sầu bi, mang lại bình an cho muôn loài.',
  },
  {
    id: 'hoa-vien-mo',
    name: 'Cổng Sang Hoa Viên Khu Mộ 3D',
    title: 'Cổng Hoa Viên • An Nghỉ Gia Tộc',
    coord: { x: 0, z: -10 },
    description: 'Lối đi phong cảnh kết nối từ hậu viên chùa sang Hoa Viên Khu Mộ 3D, nơi an nghỉ trang nghiêm của chư vị hương linh.',
    statueName: 'Cổng Khóa Bảo Mật Hoa Viên',
    icon: '🪦',
    speechText: 'A Di Đà Phật. Đây là cổng dẫn sang Hoa Viên Khu Mộ 3D. Nơi quý Phật tử có thể viếng mộ, chăm sóc bia mộ gia tiên và dâng hoa quả tưởng niệm người quá cố.',
  },
];

interface Temple3DCanvasProps {
  timeOfDay?: 'day' | 'dusk' | 'night';
  isIncenseLit?: boolean;
  isBellRinging?: boolean;
  selectedHallId?: string;
  onSelectHall?: (hall: TempleHallInfo) => void;
  onOpenOfferings?: (targetName: string) => void;
  onOpenHoaVien?: () => void;
  onShowToast?: (msg: string) => void;
  className?: string;
}

export const Temple3DCanvas: React.FC<Temple3DCanvasProps> = ({
  timeOfDay = 'dusk',
  isIncenseLit = true,
  isBellRinging = false,
  selectedHallId = 'chanh-dien',
  onSelectHall,
  onOpenOfferings,
  onOpenHoaVien,
  onShowToast = () => {},
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [currentNearHall, setCurrentNearHall] = useState<TempleHallInfo | null>(TEMPLE_HALLS[1]);
  const [isMonkLeading, setIsMonkLeading] = useState<boolean>(true);
  const [isSpeakingGuide, setIsSpeakingGuide] = useState<boolean>(false);
  const [monkSpeechText, setMonkSpeechText] = useState<string>(
    'Nam Mô A Di Đà Phật. Chú tiểu xin kính chào quý Phật tử! Quý vị có thể dùng phím mũi tên hoặc nút điều khiển để cùng chú tiểu dạo bước chiêm bái khắp ngôi chùa.'
  );

  // Position and navigation refs for continuous smooth walk
  const playerPos = useRef<{ x: number; z: number }>({ x: 0, z: 8 });
  const playerTarget = useRef<{ x: number; z: number }>({ x: 0, z: 8 });
  const cameraAngle = useRef<number>(0);
  const keysDown = useRef<Record<string, boolean>>({});
  const monkPos = useRef<{ x: number; z: number }>({ x: 0, z: 6 });
  const isWalkingRef = useRef<boolean>(false);

  // Quick navigate to hall
  const navigateToHall = useCallback((hall: TempleHallInfo) => {
    playerTarget.current = { x: hall.coord.x, z: hall.coord.z + (hall.id === 'cong-tam-quan' ? 4 : 3) };
    if (onSelectHall) onSelectHall(hall);
    setCurrentNearHall(hall);
    setMonkSpeechText(hall.speechText);
  }, [onSelectHall]);

  // Synchronize when selectedHallId changes from outside
  useEffect(() => {
    if (selectedHallId) {
      const found = TEMPLE_HALLS.find((h) => h.id === selectedHallId);
      if (found) {
        playerTarget.current = { x: found.coord.x, z: found.coord.z + (found.id === 'cong-tam-quan' ? 4 : 3) };
        setCurrentNearHall(found);
        setMonkSpeechText(found.speechText);
      }
    }
  }, [selectedHallId]);

  // Audio guide from Novice Monk
  const playMonkGuideSpeech = async () => {
    if (isSpeakingGuide) {
      stopSpeaking();
      setIsSpeakingGuide(false);
      return;
    }
    const textToSpeak = currentNearHall ? currentNearHall.speechText : monkSpeechText;
    setIsSpeakingGuide(true);
    await speakViaStudioVoiceApi(textToSpeak, {
      voiceId: MINH_HIEU_LE_CHUA_VOICE_ID,
      speedRate: 1.0,
      onEnd: () => setIsSpeakingGuide(false),
      onError: () => setIsSpeakingGuide(false),
    });
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysDown.current[e.key.toLowerCase()] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 's', 'a', 'd'].includes(e.key.toLowerCase())) {
        isWalkingRef.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.current[e.key.toLowerCase()] = false;
      const anyKey = Object.values(keysDown.current).some(Boolean);
      isWalkingRef.current = anyKey;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main Three.js setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 550;

    // 1. Scene & Fog
    const scene = new THREE.Scene();
    const fogColor = timeOfDay === 'night' ? 0x080c18 : timeOfDay === 'dusk' ? 0x241428 : 0x182436;
    scene.fog = new THREE.FogExp2(fogColor, 0.022);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 120);
    camera.position.set(0, 3.5, 14);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = timeOfDay === 'night' ? 1.0 : timeOfDay === 'dusk' ? 1.25 : 1.35;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Studio Environment Lighting
    const pmremGen = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGen.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGen.dispose();

    const hemiLight = new THREE.HemisphereLight(0xffecd2, 0x1f2430, 0.9);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffdf99, 1.8);
    sunLight.position.set(12, 22, 16);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 60;
    sunLight.shadow.camera.left = -25;
    sunLight.shadow.camera.right = 25;
    sunLight.shadow.camera.top = 25;
    sunLight.shadow.camera.bottom = -25;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // 5. Procedural Materials
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffcc33,
      metalness: 0.85,
      roughness: 0.22,
    });
    const woodPillarMat = new THREE.MeshStandardMaterial({
      color: 0x5a1810, // Son son gụ
      roughness: 0.35,
      metalness: 0.2,
    });
    const roofTileMat = new THREE.MeshStandardMaterial({
      color: 0xb83d1c, // Ngói vảy cá đỏ gạch cổ truyền
      roughness: 0.6,
      metalness: 0.1,
    });
    const whiteMarbleMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      roughness: 0.25,
      metalness: 0.15,
    });
    const stonePavementMat = new THREE.MeshStandardMaterial({
      color: 0x22201d,
      roughness: 0.8,
      metalness: 0.1,
    });
    const greenGrassMat = new THREE.MeshStandardMaterial({
      color: 0x1f361d,
      roughness: 0.9,
    });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1a454d,
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.85,
    });

    // 5b. Photorealistic Authentic Statue Textures
    const texLoader = new THREE.TextureLoader();
    const shakyamuniRealTex = texLoader.load('/assets/aistudio/images_44773acb.jfif');
    shakyamuniRealTex.colorSpace = THREE.SRGBColorSpace;
    const quanAmRealTex = texLoader.load(new URL('../../assets/images/boddhisattva_quan_am_real_1793969741943.jpg', import.meta.url).href);
    quanAmRealTex.colorSpace = THREE.SRGBColorSpace;
    const diaTangRealTex = texLoader.load('/assets/aistudio/_aiiatang_4950003d.jfif');
    diaTangRealTex.colorSpace = THREE.SRGBColorSpace;

    // 6. Ground Courtyard & Pathways
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMesh = new THREE.Mesh(groundGeo, greenGrassMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.05;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Central Stone Pathway (Đường lát đá hoa cương xuyên suốt từ Cổng Tam Quan tới Chánh Điện)
    const pathGeo = new THREE.PlaneGeometry(5, 30);
    const pathMesh = new THREE.Mesh(pathGeo, stonePavementMat);
    pathMesh.rotation.x = -Math.PI / 2;
    pathMesh.position.set(0, 0, 2);
    pathMesh.receiveShadow = true;
    scene.add(pathMesh);

    // Cross Pathway to side halls
    const crossPathGeo = new THREE.PlaneGeometry(22, 4);
    const crossPathMesh = new THREE.Mesh(crossPathGeo, stonePavementMat);
    crossPathMesh.rotation.x = -Math.PI / 2;
    crossPathMesh.position.set(0, 0.01, 2);
    crossPathMesh.receiveShadow = true;
    scene.add(crossPathMesh);

    // ==========================================
    // 7. CỔNG TAM QUAN (MAJESTIC VIETNAMESE TRIPLE PAGODA GATE) AT Z = 14
    // ==========================================
    const gateGroup = new THREE.Group();
    gateGroup.position.set(0, 0, 14);

    // Stone Base Platform with 3-tier Stairs
    const gateBaseGeo = new THREE.BoxGeometry(11.2, 0.4, 3.8);
    const gateBase = new THREE.Mesh(gateBaseGeo, stonePavementMat);
    gateBase.position.set(0, 0.2, 0);
    gateBase.receiveShadow = true;
    gateGroup.add(gateBase);

    // Front 3-tier Stone Steps
    for (let s = 1; s <= 3; s++) {
      const stepGeo = new THREE.BoxGeometry(7.0 - s * 0.4, 0.1, 0.5);
      const step = new THREE.Mesh(stepGeo, stonePavementMat);
      step.position.set(0, 0.2 - s * 0.06, 1.9 + s * 0.45);
      step.receiveShadow = true;
      gateGroup.add(step);
    }

    // 4 Main Red Lacquer Wooden Pillars with Gold Bases
    const pillarPositions = [
      { x: -3.6, h: 4.4, r: 0.26 }, // Outer Left
      { x: -1.3, h: 5.4, r: 0.32 }, // Inner Left (taller)
      { x: 1.3, h: 5.4, r: 0.32 },  // Inner Right (taller)
      { x: 3.6, h: 4.4, r: 0.26 },  // Outer Right
    ];

    pillarPositions.forEach(({ x, h, r }) => {
      // Main pillar
      const colGeo = new THREE.CylinderGeometry(r * 0.9, r, h, 16);
      const col = new THREE.Mesh(colGeo, woodPillarMat);
      col.position.set(x, 0.4 + h / 2, 0);
      col.castShadow = true;
      gateGroup.add(col);

      // Lotus Gold base
      const bGeo = new THREE.CylinderGeometry(r * 1.4, r * 1.6, 0.35, 16);
      const bCol = new THREE.Mesh(bGeo, goldMat);
      bCol.position.set(x, 0.4 + 0.175, 0);
      gateGroup.add(bCol);

      // Gold capital (Đầu cột thếp vàng)
      const capGeo = new THREE.CylinderGeometry(r * 1.35, r, 0.25, 16);
      const cap = new THREE.Mesh(capGeo, goldMat);
      cap.position.set(x, 0.4 + h - 0.125, 0);
      gateGroup.add(cap);
    });

    // Cross Beams & Arched Lintels (Xà ngang & vòm cửa)
    // Central Main Arch Lintel
    const centerBeamGeo = new THREE.BoxGeometry(3.0, 0.35, 0.4);
    const centerBeam = new THREE.Mesh(centerBeamGeo, woodPillarMat);
    centerBeam.position.set(0, 4.2, 0);
    gateGroup.add(centerBeam);

    // Side Arches Lintels
    [-2.45, 2.45].forEach((bx) => {
      const sideBeamGeo = new THREE.BoxGeometry(2.5, 0.3, 0.35);
      const sideBeam = new THREE.Mesh(sideBeamGeo, woodPillarMat);
      sideBeam.position.set(bx, 3.4, 0);
      gateGroup.add(sideBeam);
    });

    // 2-Tier Vietnamese Pagoda Roof (Mái Chồng Diêm Ngói Mũi Hài)
    // Lower Main Tier covering all 3 portals
    const lowerRoofGeo = new THREE.BoxGeometry(10.6, 0.5, 3.2);
    const lowerRoof = new THREE.Mesh(lowerRoofGeo, roofTileMat);
    lowerRoof.position.set(0, 4.6, 0);
    lowerRoof.castShadow = true;
    gateGroup.add(lowerRoof);

    // Upswept Dragon Curved Eaves on lower roof corners (Đầu đao cong vút)
    [[-5.2, -1.5], [-5.2, 1.5], [5.2, -1.5], [5.2, 1.5]].forEach(([cx, cz]) => {
      const hornGeo = new THREE.ConeGeometry(0.2, 1.0, 8);
      const horn = new THREE.Mesh(hornGeo, goldMat);
      horn.position.set(cx, 4.9, cz);
      horn.rotation.z = cx < 0 ? Math.PI / 4 : -Math.PI / 4;
      horn.rotation.x = cz < 0 ? -Math.PI / 8 : Math.PI / 8;
      gateGroup.add(horn);
    });

    // Upper Pavilion / Central Tower (Cổ Diêm / Gác Lầu Giữa)
    const atticGroup = new THREE.Group();
    atticGroup.position.set(0, 5.0, 0);

    // 4 Attic Mini Columns
    [[-1.1, -0.6], [1.1, -0.6], [-1.1, 0.6], [1.1, 0.6]].forEach(([ax, az]) => {
      const mColGeo = new THREE.CylinderGeometry(0.12, 0.14, 1.4, 12);
      const mCol = new THREE.Mesh(mColGeo, woodPillarMat);
      mCol.position.set(ax, 0.7, az);
      atticGroup.add(mCol);
    });

    // Upper Pagoda Roof
    const upperRoofGeo = new THREE.BoxGeometry(4.8, 0.45, 2.4);
    const upperRoof = new THREE.Mesh(upperRoofGeo, roofTileMat);
    upperRoof.position.set(0, 1.6, 0);
    upperRoof.castShadow = true;
    atticGroup.add(upperRoof);

    // Sacred Golden Stupa Spire (Hồ Lô Kim Đỉnh)
    const gateSpireGeo = new THREE.ConeGeometry(0.28, 1.4, 12);
    const gateSpire = new THREE.Mesh(gateSpireGeo, goldMat);
    gateSpire.position.set(0, 2.4, 0);
    atticGroup.add(gateSpire);

    // Golden Stupa Base Sphere
    const spireBallGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const spireBall = new THREE.Mesh(spireBallGeo, goldMat);
    spireBall.position.set(0, 1.9, 0);
    atticGroup.add(spireBall);

    gateGroup.add(atticGroup);

    // Hoành Phi Thếp Vàng: "ĐẠI BI CỔ TỰ" (Main Calligraphy Signboard)
    const mainPlaqueTex = createSignCanvasTexture('ĐẠI BI CỔ TỰ', 'TAM GIẢI THOÁT MÔN');
    const mainPlaqueMat = new THREE.MeshStandardMaterial({
      map: mainPlaqueTex,
      roughness: 0.3,
      metalness: 0.2,
    });
    const mainPlaqueGeo = new THREE.BoxGeometry(2.8, 0.85, 0.08);
    const mainPlaque = new THREE.Mesh(mainPlaqueGeo, mainPlaqueMat);
    mainPlaque.position.set(0, 3.65, 0.22);
    gateGroup.add(mainPlaque);

    // Side Arches Signboards: "TỪ BI" & "HỶ XẢ"
    const tuBiTex = createSignCanvasTexture('TỪ BI');
    const hyXaTex = createSignCanvasTexture('HỶ XẢ');
    const tuBiMat = new THREE.MeshStandardMaterial({ map: tuBiTex, roughness: 0.3 });
    const hyXaMat = new THREE.MeshStandardMaterial({ map: hyXaTex, roughness: 0.3 });

    const sidePlaqueGeo = new THREE.BoxGeometry(1.6, 0.5, 0.06);
    const tuBiPlaque = new THREE.Mesh(sidePlaqueGeo, tuBiMat);
    tuBiPlaque.position.set(-2.45, 3.0, 0.2);
    gateGroup.add(tuBiPlaque);

    const hyXaPlaque = new THREE.Mesh(sidePlaqueGeo, hyXaMat);
    hyXaPlaque.position.set(2.45, 3.0, 0.2);
    gateGroup.add(hyXaPlaque);

    // Vertical Golden Couplets (Câu Đối Đỏ Sơn Son Thếp Vàng trên 2 Cột Chính)
    const coupletLeftTex = createCoupletCanvasTexture(['PHẬT', 'QUANG', 'PHỔ', 'CHIẾU']);
    const coupletRightTex = createCoupletCanvasTexture(['PHÁP', 'VŨ', 'TRIÊM', 'NHUẬN']);
    const coupletLeftMat = new THREE.MeshStandardMaterial({ map: coupletLeftTex, roughness: 0.3 });
    const coupletRightMat = new THREE.MeshStandardMaterial({ map: coupletRightTex, roughness: 0.3 });
    const coupletGeo = new THREE.BoxGeometry(0.32, 2.2, 0.06);

    const coupletLeft = new THREE.Mesh(coupletGeo, coupletLeftMat);
    coupletLeft.position.set(-1.3, 2.3, 0.34);
    gateGroup.add(coupletLeft);

    const coupletRight = new THREE.Mesh(coupletGeo, coupletRightMat);
    coupletRight.position.set(1.3, 2.3, 0.34);
    gateGroup.add(coupletRight);

    // Cặp Sư Tử Đá / Nghê Đá Canh Cổng (Stone Guardian Lions)
    [-4.8, 4.8].forEach((lx) => {
      const lionGroup = new THREE.Group();
      lionGroup.position.set(lx, 0.2, 1.8);

      // Stone Pedestal
      const pedGeo = new THREE.BoxGeometry(0.9, 0.7, 1.1);
      const ped = new THREE.Mesh(pedGeo, stonePavementMat);
      ped.position.y = 0.35;
      lionGroup.add(ped);

      // Carved Lion Body
      const lBodyGeo = new THREE.CylinderGeometry(0.3, 0.38, 0.75, 12);
      const lBody = new THREE.Mesh(lBodyGeo, whiteMarbleMat);
      lBody.position.set(0, 0.95, -0.1);
      lionGroup.add(lBody);

      // Lion Chest & Mane
      const lChestGeo = new THREE.SphereGeometry(0.35, 12, 12);
      const lChest = new THREE.Mesh(lChestGeo, whiteMarbleMat);
      lChest.position.set(0, 1.25, 0.08);
      lionGroup.add(lChest);

      // Lion Head with Snout
      const lHeadGeo = new THREE.SphereGeometry(0.28, 12, 12);
      const lHead = new THREE.Mesh(lHeadGeo, whiteMarbleMat);
      lHead.position.set(0, 1.5, 0.15);
      lionGroup.add(lHead);

      gateGroup.add(lionGroup);
    });

    // 4 Hanging Red Silk Lanterns with Golden Tassels (Đèn Lồng Đỏ Treo Mái Cổng)
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xcc1111,
      roughness: 0.3,
      emissive: 0x660808,
      emissiveIntensity: 0.6,
    });
    [-3.6, -1.3, 1.3, 3.6].forEach((lx) => {
      const lanGroup = new THREE.Group();
      lanGroup.position.set(lx, 4.1, 0.8);

      // Cord
      const cordGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8);
      const cord = new THREE.Mesh(cordGeo, goldMat);
      cord.position.y = 0.25;
      lanGroup.add(cord);

      // Red Lantern Body
      const lanBodyGeo = new THREE.SphereGeometry(0.28, 16, 16);
      lanBodyGeo.scale(1, 1.25, 1);
      const lanBody = new THREE.Mesh(lanBodyGeo, lanternMat);
      lanGroup.add(lanBody);

      // Top & Bottom Gold Rings
      [-0.32, 0.32].forEach((ry) => {
        const ringGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.06, 12);
        const ring = new THREE.Mesh(ringGeo, goldMat);
        ring.position.y = ry;
        lanGroup.add(ring);
      });

      // Gold Tassel
      const tasselGeo = new THREE.ConeGeometry(0.08, 0.35, 8);
      const tassel = new THREE.Mesh(tasselGeo, goldMat);
      tassel.position.y = -0.52;
      lanGroup.add(tassel);

      // Warm Point Light
      const lanternLight = new THREE.PointLight(0xff7722, 0.8, 6);
      lanternLight.position.set(0, 0, 0);
      lanGroup.add(lanternLight);

      gateGroup.add(lanGroup);
    });

    // Large Bronze/Stone Incense Burner in front of Cổng Tam Quan (Lư Hương Cổng Chùa)
    const frontUrnGroup = new THREE.Group();
    frontUrnGroup.position.set(0, 0.2, 3.4);

    // Stone Platform
    const urnPlatGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.25, 24);
    const urnPlat = new THREE.Mesh(urnPlatGeo, stonePavementMat);
    urnPlat.position.y = 0.125;
    frontUrnGroup.add(urnPlat);

    // Bronze Tripod Cauldron
    const urnBowlGeo = new THREE.CylinderGeometry(0.7, 0.55, 0.8, 20);
    const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x5a3e1b, roughness: 0.4, metalness: 0.7 });
    const urnBowl = new THREE.Mesh(urnBowlGeo, bronzeMat);
    urnBowl.position.y = 0.65;
    frontUrnGroup.add(urnBowl);

    // 3 Incense Sticks with glowing red tips
    [-0.15, 0, 0.15].forEach((ix, i) => {
      const stickGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.9, 8);
      const stickMat = new THREE.MeshStandardMaterial({ color: 0x8b3a0e });
      const stick = new THREE.Mesh(stickGeo, stickMat);
      stick.position.set(ix, 1.25, (i === 1 ? -0.05 : 0.05));
      stick.rotation.z = (ix * 0.4);
      frontUrnGroup.add(stick);

      // Glowing Ember Tip
      const emberGeo = new THREE.SphereGeometry(0.03, 8, 8);
      const emberMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
      const ember = new THREE.Mesh(emberGeo, emberMat);
      ember.position.set(ix + ix * 0.15, 1.7, (i === 1 ? -0.05 : 0.05));
      frontUrnGroup.add(ember);
    });

    gateGroup.add(frontUrnGroup);
    scene.add(gateGroup);

    // ==========================================
    // 8. ĐẠI HÙNG BẢO ĐIỆN (CHÁNH ĐIỆN) AT Z = 0
    // ==========================================
    const mainHallGroup = new THREE.Group();
    mainHallGroup.position.set(0, 0, 0);

    // Raised Stone Platform
    const platformGeo = new THREE.BoxGeometry(14, 0.8, 12);
    const platform = new THREE.Mesh(platformGeo, stonePavementMat);
    platform.position.set(0, 0.4, 0);
    platform.receiveShadow = true;
    mainHallGroup.add(platform);

    // Main Columns
    const hallColCoords = [
      [-4.5, -3.5], [-1.5, -3.5], [1.5, -3.5], [4.5, -3.5],
      [-4.5, 3.5], [-1.5, 3.5], [1.5, 3.5], [4.5, 3.5],
    ];
    hallColCoords.forEach(([x, z]) => {
      const colGeo = new THREE.CylinderGeometry(0.28, 0.32, 6.0, 16);
      const col = new THREE.Mesh(colGeo, woodPillarMat);
      col.position.set(x, 3.8, z);
      col.castShadow = true;
      mainHallGroup.add(col);

      // Gold lotus base
      const bGeo = new THREE.CylinderGeometry(0.42, 0.5, 0.35, 16);
      const bCol = new THREE.Mesh(bGeo, goldMat);
      bCol.position.set(x, 0.95, z);
      mainHallGroup.add(bCol);
    });

    // 2-Tier Pagoda Curved Roof
    const roof1Geo = new THREE.BoxGeometry(15.5, 0.6, 13.5);
    const roof1 = new THREE.Mesh(roof1Geo, roofTileMat);
    roof1.position.set(0, 6.5, 0);
    roof1.castShadow = true;
    mainHallGroup.add(roof1);

    const roof2Geo = new THREE.BoxGeometry(11.5, 0.7, 9.5);
    const roof2 = new THREE.Mesh(roof2Geo, roofTileMat);
    roof2.position.set(0, 7.8, 0);
    roof2.castShadow = true;
    mainHallGroup.add(roof2);

    // Golden Spire on top (Hồ Lô Kim Tháp)
    const spireGeo = new THREE.ConeGeometry(0.4, 2.2, 16);
    const spire = new THREE.Mesh(spireGeo, goldMat);
    spire.position.set(0, 9.3, 0);
    mainHallGroup.add(spire);

    // ==========================================
    // 9. KIM THÂN ĐỨC PHẬT THÍCH CA MÂU NI (REAL 3D BUDDHA STATUE)
    // ==========================================
    const buddhaGroup = new THREE.Group();
    buddhaGroup.position.set(0, 1.0, -1.5);

    // Multi-tier Lotus Throne (Đài Sen Tam Cấp)
    const lotusTier1Geo = new THREE.CylinderGeometry(2.0, 2.4, 0.45, 24);
    const lotusTier1 = new THREE.Mesh(lotusTier1Geo, goldMat);
    lotusTier1.position.y = 0.25;
    buddhaGroup.add(lotusTier1);

    const lotusTier2Geo = new THREE.CylinderGeometry(1.6, 1.9, 0.4, 24);
    const lotusTier2 = new THREE.Mesh(lotusTier2Geo, goldMat);
    lotusTier2.position.y = 0.65;
    buddhaGroup.add(lotusTier2);

    // Individual Sculpted Lotus Petals around throne
    const petalGeo = new THREE.ConeGeometry(0.18, 0.45, 5);
    for (let p = 0; p < 16; p++) {
      const angle = (p / 16) * Math.PI * 2;
      const petal = new THREE.Mesh(petalGeo, goldMat);
      petal.position.set(Math.cos(angle) * 1.65, 0.85, Math.sin(angle) * 1.65);
      petal.rotation.x = Math.PI / 4;
      petal.rotation.y = angle;
      buddhaGroup.add(petal);
    }

    // ==========================================
    // 9. KIM THÂN ĐỨC PHẬT THÍCH CA MÂU NI (REAL 3D PHOTOREALISTIC BUDDHA STATUE)
    // ==========================================
    // Tôn tượng thật Đức Bổn Sư Thích Ca Mâu Ni thếp vàng rực rỡ ngự trên đài sen
    const realStatueWidth = 2.4;
    const realStatueHeight = 3.3;

    // Real Statue Front Display (Mapped with authentic golden Buddha on lotus throne)
    const realBuddhaGeo = new THREE.PlaneGeometry(realStatueWidth, realStatueHeight);
    const realBuddhaMat = new THREE.MeshStandardMaterial({
      map: shakyamuniRealTex,
      roughness: 0.25,
      metalness: 0.25,
      side: THREE.DoubleSide,
    });
    const realBuddhaMesh = new THREE.Mesh(realBuddhaGeo, realBuddhaMat);
    realBuddhaMesh.position.set(0, 2.5, 0.04);
    realBuddhaMesh.castShadow = true;
    buddhaGroup.add(realBuddhaMesh);

    // Realistic gold backing giving the statue solid 3D depth and thickness on the altar
    const statueBacking = new THREE.Mesh(
      new THREE.BoxGeometry(realStatueWidth + 0.12, realStatueHeight + 0.12, 0.14),
      goldMat
    );
    statueBacking.position.set(0, 2.5, -0.04);
    statueBacking.castShadow = true;
    buddhaGroup.add(statueBacking);

    // Golden Dharmachakra Halo (Hào quang Phật chuyển động sau đầu)
    const haloGeo = new THREE.TorusGeometry(1.4, 0.06, 16, 64);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.85 });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.set(0, 3.25, -0.16);
    buddhaGroup.add(halo);

    // Radiating sunburst disc
    const sunburstGeo = new THREE.CircleGeometry(1.35, 32);
    const sunburstMat = new THREE.MeshBasicMaterial({
      color: 0xffd54f,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const sunburst = new THREE.Mesh(sunburstGeo, sunburstMat);
    sunburst.position.set(0, 3.25, -0.18);
    buddhaGroup.add(sunburst);

    // Warm golden spiritual light emanating from Buddha statue
    const buddhaAuraLight = new THREE.PointLight(0xffdf80, 1.8, 6.0);
    buddhaAuraLight.position.set(0, 2.8, 0.8);
    buddhaGroup.add(buddhaAuraLight);

    // Signboard: "ĐẠI HÙNG BẢO ĐIỆN"
    const hallPlaqueTex = createSignCanvasTexture('ĐẠI HÙNG BẢO ĐIỆN', 'VẠN ĐỨC TRANG NGHIÊM');
    const hallPlaqueMat = new THREE.MeshStandardMaterial({
      map: hallPlaqueTex,
      roughness: 0.3,
      metalness: 0.2,
    });
    const hallPlaqueGeo = new THREE.BoxGeometry(3.6, 0.9, 0.08);
    const hallPlaque = new THREE.Mesh(hallPlaqueGeo, hallPlaqueMat);
    hallPlaque.position.set(0, 5.7, 3.6);
    mainHallGroup.add(hallPlaque);

    // Front Offering Altar Table (Bàn Thờ Tam Bảo Cung Dâng Hoa Quả & Đèn Nến)
    const altarTableGeo = new THREE.BoxGeometry(4.2, 0.9, 1.4);
    const altarTableMat = new THREE.MeshStandardMaterial({ color: 0x42120e, roughness: 0.4 });
    const altarTable = new THREE.Mesh(altarTableGeo, altarTableMat);
    altarTable.position.set(0, 0.85, 1.0);
    altarTable.castShadow = true;
    mainHallGroup.add(altarTable);

    // Pair of Golden Candle Stands (Đôi Chân Đèn Đồng Thắp Nến)
    [-1.6, 1.6].forEach((cx) => {
      const standGeo = new THREE.CylinderGeometry(0.08, 0.16, 0.8, 12);
      const stand = new THREE.Mesh(standGeo, goldMat);
      stand.position.set(cx, 1.7, 1.0);
      mainHallGroup.add(stand);

      // Candle Flame
      const flameGeo = new THREE.ConeGeometry(0.04, 0.15, 8);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(cx, 2.18, 1.0);
      mainHallGroup.add(flame);

      const candleLight = new THREE.PointLight(0xff9900, 0.6, 5);
      candleLight.position.set(cx, 2.2, 1.0);
      mainHallGroup.add(candleLight);
    });

    // Plates of Offering Fruits & Lotus Flowers (Dâng Hoa Quả & Bình Hoa Sen Cúng Dường)
    // Left: Ornate Golden Lotus Vase with Blooming Lotus Flowers
    const vaseGeo = new THREE.CylinderGeometry(0.18, 0.12, 0.6, 16);
    const vaseMesh = new THREE.Mesh(vaseGeo, goldMat);
    vaseMesh.position.set(-0.85, 1.5, 1.0);
    mainHallGroup.add(vaseMesh);

    // Blooming Lotus Flowers in vase
    const lotusPetalGeo = new THREE.ConeGeometry(0.08, 0.28, 6);
    const lotusMat = new THREE.MeshStandardMaterial({ color: 0xff6699, roughness: 0.3 });
    for (let lp = 0; lp < 5; lp++) {
      const angle = (lp / 5) * Math.PI * 2;
      const petal = new THREE.Mesh(lotusPetalGeo, lotusMat);
      petal.position.set(-0.85 + Math.cos(angle) * 0.1, 1.88, 1.0 + Math.sin(angle) * 0.1);
      petal.rotation.x = Math.PI / 6;
      petal.rotation.y = angle;
      mainHallGroup.add(petal);
    }
    const lotusCore = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), goldMat);
    lotusCore.position.set(-0.85, 1.9, 1.0);
    mainHallGroup.add(lotusCore);

    // Right: Tiered Five-Fruit Offering Tray (Mâm Ngũ Quả Cúng Phật)
    const fruitTrayGeo = new THREE.CylinderGeometry(0.38, 0.22, 0.12, 20);
    const fruitTray = new THREE.Mesh(fruitTrayGeo, goldMat);
    fruitTray.position.set(0.85, 1.36, 1.0);
    mainHallGroup.add(fruitTray);

    // Fruit Pyramid on Tray
    const fruitColors = [0xff5500, 0xffbb00, 0xdd2222, 0x55aa22, 0xffaa33];
    const fruitOffsets = [
      [-0.1, 0, -0.08],
      [0.1, 0, -0.08],
      [0, 0, 0.1],
      [-0.08, 0.14, 0.02],
      [0.08, 0.14, 0.02],
      [0, 0.26, 0],
    ];
    fruitOffsets.forEach(([fx, fy, fz], fIdx) => {
      const fGeo = new THREE.SphereGeometry(0.09, 12, 12);
      const fMat = new THREE.MeshStandardMaterial({
        color: fruitColors[fIdx % fruitColors.length],
        roughness: 0.35,
      });
      const fMesh = new THREE.Mesh(fGeo, fMat);
      fMesh.position.set(0.85 + fx, 1.48 + fy, 1.0 + fz);
      mainHallGroup.add(fMesh);
    });

    // Incense Urn & Burner in front of Buddha
    const urnGeo = new THREE.CylinderGeometry(0.4, 0.5, 0.45, 16);
    const urn = new THREE.Mesh(urnGeo, goldMat);
    urn.position.set(0, 1.45, 1.35);
    mainHallGroup.add(urn);

    // 3 Golden Incense Sticks on Altar
    [-0.08, 0, 0.08].forEach((sx) => {
      const stGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.65, 8);
      const stMat = new THREE.MeshStandardMaterial({ color: 0x8b2500 });
      const st = new THREE.Mesh(stGeo, stMat);
      st.position.set(sx, 1.85, 1.35);
      mainHallGroup.add(st);

      const tipGeo = new THREE.SphereGeometry(0.02, 6, 6);
      const tipMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.set(sx, 2.18, 1.35);
      mainHallGroup.add(tip);
    });

    mainHallGroup.add(buddhaGroup);
    scene.add(mainHallGroup);

    // ==========================================
    // 10. ĐIỆN QUÁN THẾ ÂM (LOTUS POND & STATUE) AT X = -8, Z = 2
    // ==========================================
    const quanAmGroup = new THREE.Group();
    quanAmGroup.position.set(-8, 0, 2);

    // Lotus Pond
    const pondGeo = new THREE.CylinderGeometry(3.5, 3.8, 0.4, 32);
    const pondWater = new THREE.Mesh(pondGeo, waterMat);
    pondWater.position.y = 0.15;
    quanAmGroup.add(pondWater);

    const pondBorderGeo = new THREE.TorusGeometry(3.6, 0.3, 12, 32);
    const pondBorder = new THREE.Mesh(pondBorderGeo, whiteMarbleMat);
    pondBorder.rotation.x = Math.PI / 2;
    pondBorder.position.y = 0.3;
    quanAmGroup.add(pondBorder);

    // Quan Âm White Marble Statue (Tôn tượng Quán Thế Âm Bạch Ngọc Thật)
    const qaPedestalGeo = new THREE.CylinderGeometry(1.1, 1.3, 1.0, 16);
    const qaPedestal = new THREE.Mesh(qaPedestalGeo, whiteMarbleMat);
    qaPedestal.position.y = 0.6;
    quanAmGroup.add(qaPedestal);

    // Real Bodhisattva Avalokiteshvara Statue (Tôn tượng Quán Thế Âm Thật)
    const qaStatueWidth = 2.4;
    const qaStatueHeight = 3.4;
    const qaStatueGeo = new THREE.PlaneGeometry(qaStatueWidth, qaStatueHeight);
    const qaStatueMat = new THREE.MeshStandardMaterial({
      map: quanAmRealTex,
      roughness: 0.3,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const realQaMesh = new THREE.Mesh(qaStatueGeo, qaStatueMat);
    realQaMesh.position.set(0, 2.3, 0.04);
    realQaMesh.castShadow = true;
    quanAmGroup.add(realQaMesh);

    // Marble backing for 3D thickness
    const qaBacking = new THREE.Mesh(
      new THREE.BoxGeometry(qaStatueWidth + 0.1, qaStatueHeight + 0.1, 0.12),
      whiteMarbleMat
    );
    qaBacking.position.set(0, 2.3, -0.04);
    qaBacking.castShadow = true;
    quanAmGroup.add(qaBacking);

    // Cam Lộ Halo (Hào quang tịnh thủy thanh lương)
    const qaHaloGeo = new THREE.TorusGeometry(1.3, 0.05, 16, 48);
    const qaHaloMat = new THREE.MeshBasicMaterial({ color: 0x99eeff, transparent: true, opacity: 0.8 });
    const qaHalo = new THREE.Mesh(qaHaloGeo, qaHaloMat);
    qaHalo.position.set(0, 3.1, -0.12);
    quanAmGroup.add(qaHalo);

    const qaAuraLight = new THREE.PointLight(0xaae8ff, 1.5, 5.0);
    qaAuraLight.position.set(0, 2.6, 0.6);
    quanAmGroup.add(qaAuraLight);

    scene.add(quanAmGroup);

    // ==========================================
    // 11. ĐIỆN ĐỊA TẠNG VƯƠNG AT X = 8, Z = 2
    // ==========================================
    const diaTangGroup = new THREE.Group();
    diaTangGroup.position.set(8, 0, 2);

    const dtPlatformGeo = new THREE.BoxGeometry(6, 0.5, 6);
    const dtPlatform = new THREE.Mesh(dtPlatformGeo, stonePavementMat);
    dtPlatform.position.y = 0.25;
    diaTangGroup.add(dtPlatform);

    // Địa Tạng Statue & Lotus Base
    const dtLotusGeo = new THREE.CylinderGeometry(1.4, 1.7, 0.5, 16);
    const dtLotus = new THREE.Mesh(dtLotusGeo, goldMat);
    dtLotus.position.y = 0.7;
    diaTangGroup.add(dtLotus);

    // Real Bodhisattva Ksitigarbha Statue (Tôn tượng Địa Tạng Vương Bồ Tát Thật)
    const dtStatueWidth = 2.4;
    const dtStatueHeight = 3.4;
    const dtStatueGeo = new THREE.PlaneGeometry(dtStatueWidth, dtStatueHeight);
    const dtStatueMat = new THREE.MeshStandardMaterial({
      map: diaTangRealTex,
      roughness: 0.25,
      metalness: 0.25,
      side: THREE.DoubleSide,
    });
    const realDtMesh = new THREE.Mesh(dtStatueGeo, dtStatueMat);
    realDtMesh.position.set(0, 2.4, 0.04);
    realDtMesh.castShadow = true;
    diaTangGroup.add(realDtMesh);

    // Golden backing for 3D thickness
    const dtBacking = new THREE.Mesh(
      new THREE.BoxGeometry(dtStatueWidth + 0.1, dtStatueHeight + 0.1, 0.12),
      goldMat
    );
    dtBacking.position.set(0, 2.4, -0.04);
    dtBacking.castShadow = true;
    diaTangGroup.add(dtBacking);

    // Golden Khakkhara Staff (Tích Trượng 12 Khoen Vàng)
    const staffGeo = new THREE.CylinderGeometry(0.03, 0.03, 3.8, 8);
    const staff = new THREE.Mesh(staffGeo, goldMat);
    staff.position.set(0.85, 2.4, 0.2);
    diaTangGroup.add(staff);

    // U Minh Halo (Hào quang cứu độ u minh)
    const dtHaloGeo = new THREE.TorusGeometry(1.3, 0.05, 16, 48);
    const dtHaloMat = new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 0.85 });
    const dtHalo = new THREE.Mesh(dtHaloGeo, dtHaloMat);
    dtHalo.position.set(0, 3.2, -0.12);
    diaTangGroup.add(dtHalo);

    const dtAuraLight = new THREE.PointLight(0xffb84d, 1.6, 5.0);
    dtAuraLight.position.set(0, 2.7, 0.6);
    diaTangGroup.add(dtAuraLight);

    scene.add(diaTangGroup);

    // ==========================================
    // 12. THÁP ĐẠI HỒNG CHUNG AT X = -8, Z = -5
    // ==========================================
    const bellGroup = new THREE.Group();
    bellGroup.position.set(-8, 0, -5);

    const bellTowerRoofGeo = new THREE.ConeGeometry(2.8, 2.2, 8);
    const bellTowerRoof = new THREE.Mesh(bellTowerRoofGeo, roofTileMat);
    bellTowerRoof.position.y = 5.2;
    bellGroup.add(bellTowerRoof);

    // 4 Corner Pillars
    [[-1.2, -1.2], [-1.2, 1.2], [1.2, -1.2], [1.2, 1.2]].forEach(([x, z]) => {
      const pGeo = new THREE.CylinderGeometry(0.16, 0.18, 4.2, 12);
      const pMesh = new THREE.Mesh(pGeo, woodPillarMat);
      pMesh.position.set(x, 2.1, z);
      bellGroup.add(pMesh);
    });

    // Bronze Bell (Đại Hồng Chung Đồng)
    const bellGeo = new THREE.CylinderGeometry(0.4, 0.75, 1.2, 16);
    const bellBronzeMat = new THREE.MeshStandardMaterial({ color: 0x8a5a22, metalness: 0.8, roughness: 0.3 });
    const bellMesh = new THREE.Mesh(bellGeo, bellBronzeMat);
    bellMesh.position.y = 2.6;
    bellGroup.add(bellMesh);

    scene.add(bellGroup);

    // ==========================================
    // 13. CHÚ TIỂU 3D GUIDE (NOVICE MONK CHARACTER)
    // ==========================================
    const monkGroup = new THREE.Group();
    monkGroup.position.set(0, 0, 6);

    // Brown Robe Body (Thân áo nâu sòng)
    const monkBodyGeo = new THREE.CylinderGeometry(0.24, 0.38, 1.0, 16);
    const monkRobeMat = new THREE.MeshStandardMaterial({ color: 0x5d3a1a, roughness: 0.7 });
    const monkBody = new THREE.Mesh(monkBodyGeo, monkRobeMat);
    monkBody.position.y = 0.55;
    monkGroup.add(monkBody);

    // Cute Novice Monk Head
    const monkHeadGeo = new THREE.SphereGeometry(0.24, 16, 16);
    const monkSkinMat = new THREE.MeshStandardMaterial({ color: 0xffd5b3, roughness: 0.5 });
    const monkHead = new THREE.Mesh(monkHeadGeo, monkSkinMat);
    monkHead.position.y = 1.2;
    monkGroup.add(monkHead);

    // Monk Hair Tuft (Chỏm tóc chú tiểu)
    const tuftGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const tuftMat = new THREE.MeshBasicMaterial({ color: 0x221105 });
    const tuft = new THREE.Mesh(tuftGeo, tuftMat);
    tuft.position.set(0, 1.44, 0);
    monkGroup.add(tuft);

    // Hands Pressed in Prayer (Chắp tay niệm Phật)
    const prayerHandsGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const prayerHands = new THREE.Mesh(prayerHandsGeo, monkSkinMat);
    prayerHands.position.set(0, 0.75, 0.28);
    monkGroup.add(prayerHands);

    // Buddhist Prayer Beads Necklace (Chuỗi hạt bồ đề)
    const beadsGeo = new THREE.TorusGeometry(0.2, 0.03, 8, 16);
    const beadsMat = new THREE.MeshStandardMaterial({ color: 0x3d1f05, roughness: 0.3 });
    const beads = new THREE.Mesh(beadsGeo, beadsMat);
    beads.position.set(0, 0.88, 0.15);
    beads.rotation.x = Math.PI / 4;
    monkGroup.add(beads);

    scene.add(monkGroup);

    // ==========================================
    // 14. FLOATING LOTUS PETALS (CÁNH SEN RƠI 3D)
    // ==========================================
    const petalCount = 60;
    const petalGeoInstance = new THREE.ConeGeometry(0.08, 0.18, 5);
    const petalMatInstance = new THREE.MeshStandardMaterial({
      color: 0xff9bb2,
      roughness: 0.35,
    });
    const petalInstanced = new THREE.InstancedMesh(petalGeoInstance, petalMatInstance, petalCount);
    const dummy = new THREE.Object3D();
    const petalVelocities: { x: number; y: number; z: number; vy: number; rotSpeed: number }[] = [];

    for (let i = 0; i < petalCount; i++) {
      const px = (Math.random() - 0.5) * 30;
      const py = 1 + Math.random() * 8;
      const pz = (Math.random() - 0.5) * 30;
      dummy.position.set(px, py, pz);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      dummy.scale.setScalar(0.7 + Math.random() * 0.5);
      dummy.updateMatrix();
      petalInstanced.setMatrixAt(i, dummy.matrix);
      petalVelocities.push({
        x: px,
        y: py,
        z: pz,
        vy: -0.008 - Math.random() * 0.008,
        rotSpeed: 0.01 + Math.random() * 0.02,
      });
    }
    petalInstanced.instanceMatrix.needsUpdate = true;
    scene.add(petalInstanced);

    // ==========================================
    // 15. CONTINUOUS ANIMATION LOOP WITH WALKING PHYSICS
    // ==========================================
    let frameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Process Keyboard Walk
      const speed = 6.0 * delta;
      if (keysDown.current['arrowup'] || keysDown.current['w']) {
        playerTarget.current.z -= speed;
      }
      if (keysDown.current['arrowdown'] || keysDown.current['s']) {
        playerTarget.current.z += speed;
      }
      if (keysDown.current['arrowleft'] || keysDown.current['a']) {
        playerTarget.current.x -= speed;
      }
      if (keysDown.current['arrowright'] || keysDown.current['d']) {
        playerTarget.current.x += speed;
      }
      if (keysDown.current['q']) {
        cameraAngle.current += 1.5 * delta;
      }
      if (keysDown.current['e']) {
        cameraAngle.current -= 1.5 * delta;
      }

      // Constrain player boundary
      playerTarget.current.x = Math.max(-14, Math.min(14, playerTarget.current.x));
      playerTarget.current.z = Math.max(-11, Math.min(17, playerTarget.current.z));

      // Damped camera & player movement
      playerPos.current.x = THREE.MathUtils.damp(playerPos.current.x, playerTarget.current.x, 5.0, delta);
      playerPos.current.z = THREE.MathUtils.damp(playerPos.current.z, playerTarget.current.z, 5.0, delta);

      // Monk leads slightly ahead of player
      if (isMonkLeading) {
        monkPos.current.x = THREE.MathUtils.damp(monkPos.current.x, playerPos.current.x, 3.0, delta);
        monkPos.current.z = THREE.MathUtils.damp(monkPos.current.z, playerPos.current.z - 2.2, 3.0, delta);
        monkGroup.position.set(monkPos.current.x, 0.05 * Math.sin(time * 6), monkPos.current.z);
        monkGroup.rotation.y = Math.sin(time * 2) * 0.15;
      }

      // Smooth Third-Person Camera Follow
      const camDist = 5.5;
      const camHeight = 3.2;
      const targetCamX = playerPos.current.x + Math.sin(cameraAngle.current) * camDist;
      const targetCamZ = playerPos.current.z + Math.cos(cameraAngle.current) * camDist;

      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 4.0, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, camHeight, 4.0, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamZ, 4.0, delta);
      camera.lookAt(playerPos.current.x, 1.6, playerPos.current.z - 1.2);

      // Animate Halo Rotation
      halo.rotation.z = time * 0.3;
      sunburst.rotation.z = -time * 0.15;

      // Bell swinging if rung
      if (isBellRinging) {
        bellMesh.rotation.z = Math.sin(time * 8) * 0.25;
      } else {
        bellMesh.rotation.z = 0;
      }

      // Animate Falling Petals
      for (let i = 0; i < petalCount; i++) {
        const vel = petalVelocities[i];
        vel.y += vel.vy;
        if (vel.y < 0.1) {
          vel.y = 8 + Math.random() * 2;
          vel.x = playerPos.current.x + (Math.random() - 0.5) * 20;
          vel.z = playerPos.current.z + (Math.random() - 0.5) * 20;
        }
        dummy.position.set(vel.x, vel.y, vel.z);
        dummy.rotation.x += vel.rotSpeed;
        dummy.rotation.y += vel.rotSpeed * 0.5;
        dummy.updateMatrix();
        petalInstanced.setMatrixAt(i, dummy.matrix);
      }
      petalInstanced.instanceMatrix.needsUpdate = true;

      // Detect nearest Hall
      let nearestHall: TempleHallInfo | null = null;
      let minDist = 9999;
      TEMPLE_HALLS.forEach((hall) => {
        const dx = playerPos.current.x - hall.coord.x;
        const dz = playerPos.current.z - hall.coord.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < minDist) {
          minDist = dist;
          nearestHall = hall;
        }
      });

      if (minDist < 5.0 && nearestHall) {
        setCurrentNearHall(nearestHall);
      }

      renderer.render(scene, camera);
    };

    frameId = requestAnimationFrame(animate);

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const nw = container.clientWidth || 800;
      const nh = container.clientHeight || 550;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [timeOfDay, isBellRinging, isMonkLeading]);

  return (
    <div className={`relative w-full h-[580px] sm:h-[640px] bg-slate-950 overflow-hidden rounded-3xl border border-amber-500/40 shadow-2xl select-none ${className}`}>
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Top Left: Temple Banner & Chú Tiểu Speech Bubble */}
      <div className="absolute top-4 left-4 z-20 max-w-sm sm:max-w-md pointer-events-auto space-y-2">
        <div className="bg-slate-950/85 backdrop-blur-md border border-amber-500/50 rounded-2xl p-3 shadow-xl flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center text-xl shrink-0 shadow-md">
            🧒
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                Chú Tiểu Dẫn Đường • Đại Bi Tự
              </span>
              <button
                type="button"
                onClick={playMonkGuideSpeech}
                className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1 transition-colors"
                title="Nghe chú tiểu đọc thuyết minh"
              >
                {isSpeakingGuide ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                <span>{isSpeakingGuide ? 'Dừng đọc' : 'Nghe giọng Minh Hiếu'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-200 font-serif leading-relaxed line-clamp-3">
              {currentNearHall ? currentNearHall.speechText : monkSpeechText}
            </p>
          </div>
        </div>
      </div>

      {/* Top Right: Time of Day & Current Hall Tag */}
      <div className="absolute top-4 right-4 z-20 pointer-events-auto flex items-center gap-2">
        {currentNearHall && (
          <div className="px-3.5 py-1.5 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 shadow-lg">
            <span>{currentNearHall.icon}</span>
            <span>{currentNearHall.name}</span>
          </div>
        )}
      </div>

      {/* Interactive Action Prompt when near a Hall */}
      {currentNearHall && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-2 bg-slate-950/90 backdrop-blur-md border border-amber-500/60 rounded-2xl px-4 py-2.5 shadow-2xl animate-bounce-subtle">
          <span className="text-lg">{currentNearHall.icon}</span>
          <div className="text-left pr-2">
            <span className="text-[10px] text-amber-400 font-bold uppercase block">Đang tại vị trí</span>
            <span className="text-xs font-black text-white">{currentNearHall.title}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (currentNearHall.id === 'hoa-vien-mo' && onOpenHoaVien) {
                onOpenHoaVien();
              } else if (onOpenOfferings) {
                onOpenOfferings(currentNearHall.name);
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/30 transition-transform active:scale-95"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{currentNearHall.id === 'hoa-vien-mo' ? 'Vào Khu Mộ 3D' : 'Dâng Hoa Quả Lễ Vật'}</span>
          </button>
        </div>
      )}

      {/* Mobile Touch Navigation D-Pad (Left Bottom) */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-auto flex flex-col items-center bg-slate-950/80 backdrop-blur-md p-2 rounded-2xl border border-slate-800">
        <button
          type="button"
          onMouseDown={() => { keysDown.current['arrowup'] = true; }}
          onMouseUp={() => { keysDown.current['arrowup'] = false; }}
          onTouchStart={() => { keysDown.current['arrowup'] = true; }}
          onTouchEnd={() => { keysDown.current['arrowup'] = false; }}
          className="w-8 h-8 rounded-lg bg-slate-800 active:bg-amber-500 active:text-slate-950 text-slate-200 flex items-center justify-center font-bold text-xs"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1 my-1">
          <button
            type="button"
            onMouseDown={() => { keysDown.current['arrowleft'] = true; }}
            onMouseUp={() => { keysDown.current['arrowleft'] = false; }}
            onTouchStart={() => { keysDown.current['arrowleft'] = true; }}
            onTouchEnd={() => { keysDown.current['arrowleft'] = false; }}
            className="w-8 h-8 rounded-lg bg-slate-800 active:bg-amber-500 active:text-slate-950 text-slate-200 flex items-center justify-center font-bold text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              playerTarget.current = { x: 0, z: 8 };
              cameraAngle.current = 0;
            }}
            className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-[10px]"
            title="Về trung tâm sân chùa"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={() => { keysDown.current['arrowright'] = true; }}
            onMouseUp={() => { keysDown.current['arrowright'] = false; }}
            onTouchStart={() => { keysDown.current['arrowright'] = true; }}
            onTouchEnd={() => { keysDown.current['arrowright'] = false; }}
            className="w-8 h-8 rounded-lg bg-slate-800 active:bg-amber-500 active:text-slate-950 text-slate-200 flex items-center justify-center font-bold text-xs"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <button
          type="button"
          onMouseDown={() => { keysDown.current['arrowdown'] = true; }}
          onMouseUp={() => { keysDown.current['arrowdown'] = false; }}
          onTouchStart={() => { keysDown.current['arrowdown'] = true; }}
          onTouchEnd={() => { keysDown.current['arrowdown'] = false; }}
          className="w-8 h-8 rounded-lg bg-slate-800 active:bg-amber-500 active:text-slate-950 text-slate-200 flex items-center justify-center font-bold text-xs"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      </div>

      {/* Ergonomic Bottom Dock: Quick Hall Teleport Pills */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto max-w-[92vw] overflow-x-auto p-1.5 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-amber-500/40 shadow-2xl flex items-center gap-1.5 scrollbar-none">
        {TEMPLE_HALLS.map((hall) => {
          const isCurrent = currentNearHall?.id === hall.id;
          return (
            <button
              key={hall.id}
              type="button"
              onClick={() => navigateToHall(hall)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                isCurrent
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 scale-105'
                  : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{hall.icon}</span>
              <span>{hall.name.split(' (')[0]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
