import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Temple3DCanvasProps {
  timeOfDay?: 'day' | 'dusk' | 'night';
  isIncenseLit?: boolean;
  isBellRinging?: boolean;
  className?: string;
}

export const Temple3DCanvas: React.FC<Temple3DCanvasProps> = ({
  timeOfDay = 'dusk',
  isIncenseLit = true,
  isBellRinging = false,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const bellRingingRef = useRef(isBellRinging);
  const incenseLitRef = useRef(isIncenseLit);
  const timeOfDayRef = useRef(timeOfDay);

  useEffect(() => {
    bellRingingRef.current = isBellRinging;
  }, [isBellRinging]);

  useEffect(() => {
    incenseLitRef.current = isIncenseLit;
  }, [isIncenseLit]);

  useEffect(() => {
    timeOfDayRef.current = timeOfDay;
  }, [timeOfDay]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 400;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(
      timeOfDay === 'night' ? 0x050814 : timeOfDay === 'dusk' ? 0x221226 : 0x1a2634,
      0.025
    );

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.5, 7.5);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xfff3db, 0.8);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffd580, 1.5);
    mainLight.position.set(5, 10, 7);
    scene.add(mainLight);

    const altarLight = new THREE.PointLight(0xffa726, 2, 8);
    altarLight.position.set(0, 1, 0);
    scene.add(altarLight);

    // 5. Traditional Temple Curved Roof Silhouette & Golden Pagoda Stupa
    const pagodaGroup = new THREE.Group();

    // Central Stupa Spire / Lotus Throne Base
    const baseGeo = new THREE.CylinderGeometry(1.6, 2.0, 0.5, 16);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x2b1e1a,
      roughness: 0.6,
      metalness: 0.2,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -1.2;
    pagodaGroup.add(baseMesh);

    // Second Altar Tier
    const tier2Geo = new THREE.CylinderGeometry(1.2, 1.5, 0.4, 16);
    const tier2Mat = new THREE.MeshStandardMaterial({
      color: 0x4a1c17,
      roughness: 0.5,
      metalness: 0.3,
    });
    const tier2Mesh = new THREE.Mesh(tier2Geo, tier2Mat);
    tier2Mesh.position.y = -0.8;
    pagodaGroup.add(tier2Mesh);

    // Incense Burner Urn (Đỉnh đồng hương án)
    const urnGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.4, 16);
    const urnMat = new THREE.MeshStandardMaterial({
      color: 0xc8963e,
      roughness: 0.3,
      metalness: 0.8,
    });
    const urnMesh = new THREE.Mesh(urnGeo, urnMat);
    urnMesh.position.set(0, -0.4, 0.5);
    pagodaGroup.add(urnMesh);

    // 3 Incense Sticks (Ba nén tâm hương)
    const sticksGroup = new THREE.Group();
    const stickMat = new THREE.MeshBasicMaterial({ color: 0x8b3a2b });
    const tipMat = new THREE.MeshBasicMaterial({ color: 0xff3b00 });

    [-0.08, 0, 0.08].forEach((xOffset, i) => {
      const stickGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.7, 8);
      const stickMesh = new THREE.Mesh(stickGeo, stickMat);
      stickMesh.position.set(xOffset, 0.15, 0.5 + (i === 1 ? -0.02 : 0.02));
      stickMesh.rotation.z = (i - 1) * 0.06;

      // Burning ember tip
      const tipGeo = new THREE.SphereGeometry(0.022, 8, 8);
      const tipMesh = new THREE.Mesh(tipGeo, tipMat);
      tipMesh.position.y = 0.35;
      stickMesh.add(tipMesh);

      sticksGroup.add(stickMesh);
    });
    pagodaGroup.add(sticksGroup);

    // Golden Dharmachakra / Halo Ring behind altar
    const haloGeo = new THREE.TorusGeometry(1.4, 0.05, 16, 64);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.75,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.position.set(0, 0.9, -0.6);
    pagodaGroup.add(haloMesh);

    // Inner Radiating Light Disc
    const discGeo = new THREE.CircleGeometry(1.35, 32);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0xffe082,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const discMesh = new THREE.Mesh(discGeo, discMat);
    discMesh.position.set(0, 0.9, -0.62);
    pagodaGroup.add(discMesh);

    scene.add(pagodaGroup);

    // 6. Floating Lotus Petals (Cánh sen rơi bồng bềnh 3D/4D)
    const petalCount = 70;
    const petalGeo = new THREE.ConeGeometry(0.08, 0.18, 5);
    const petalMat = new THREE.MeshStandardMaterial({
      color: 0xff9bb2,
      roughness: 0.4,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
    });

    const petalInstanced = new THREE.InstancedMesh(petalGeo, petalMat, petalCount);
    const dummy = new THREE.Object3D();
    const petalData: {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      rotX: number;
      rotY: number;
      rotZ: number;
      rotSpeedX: number;
      rotSpeedY: number;
    }[] = [];

    for (let i = 0; i < petalCount; i++) {
      const x = (Math.random() - 0.5) * 8;
      const y = Math.random() * 5 - 1;
      const z = (Math.random() - 0.5) * 6;
      petalData.push({
        x,
        y,
        z,
        vx: (Math.random() - 0.5) * 0.005,
        vy: -0.006 - Math.random() * 0.008,
        vz: (Math.random() - 0.5) * 0.005,
        rotX: Math.random() * Math.PI,
        rotY: Math.random() * Math.PI,
        rotZ: Math.random() * Math.PI,
        rotSpeedX: 0.01 + Math.random() * 0.02,
        rotSpeedY: 0.015 + Math.random() * 0.02,
      });
      dummy.position.set(x, y, z);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      dummy.scale.setScalar(0.7 + Math.random() * 0.6);
      dummy.updateMatrix();
      petalInstanced.setMatrixAt(i, dummy.matrix);
    }
    petalInstanced.instanceMatrix.needsUpdate = true;
    scene.add(petalInstanced);

    // 7. Incense Smoke Particles (Khói nhang trầm lãng đãng)
    const smokeCount = 45;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePositions = new Float32Array(smokeCount * 3);
    const smokeData: { x: number; y: number; z: number; vy: number; vx: number; alpha: number }[] = [];

    for (let i = 0; i < smokeCount; i++) {
      const y = -0.05 + Math.random() * 1.8;
      const x = (Math.random() - 0.5) * (y + 0.1) * 0.2;
      const z = 0.5 + (Math.random() - 0.5) * (y + 0.1) * 0.15;
      smokePositions[i * 3] = x;
      smokePositions[i * 3 + 1] = y;
      smokePositions[i * 3 + 2] = z;
      smokeData.push({
        x,
        y,
        z,
        vy: 0.008 + Math.random() * 0.008,
        vx: (Math.random() - 0.5) * 0.002,
        alpha: 1 - y / 2.0,
      });
    }
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));

    const smokeMat = new THREE.PointsMaterial({
      color: 0xdddddd,
      size: 0.09,
      transparent: true,
      opacity: 0.45,
      blending: THREE.NormalBlending,
    });
    const smokePoints = new THREE.Points(smokeGeo, smokeMat);
    scene.add(smokePoints);

    // 8. Interactive Mouse Drag Orbit
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let targetRotationY = 0;
    let targetRotationX = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      targetRotationY += deltaX * 0.005;
      targetRotationX += deltaY * 0.003;
      targetRotationX = Math.max(-0.25, Math.min(0.35, targetRotationX));
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    // Touch Support
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - prevMouseX;
      const deltaY = e.touches[0].clientY - prevMouseY;
      prevMouseX = e.touches[0].clientX;
      prevMouseY = e.touches[0].clientY;

      targetRotationY += deltaX * 0.005;
      targetRotationX += deltaY * 0.003;
      targetRotationX = Math.max(-0.25, Math.min(0.35, targetRotationX));
    };

    const onTouchEnd = () => {
      isDragging = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 400;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 9. Animation Loop
    let animId = 0;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth camera orbit rotation
      pagodaGroup.rotation.y += (targetRotationY - pagodaGroup.rotation.y) * 0.05;
      pagodaGroup.rotation.x += (targetRotationX - pagodaGroup.rotation.x) * 0.05;

      // Subtle constant gentle sway when idle
      if (!isDragging) {
        targetRotationY += 0.0012;
      }

      // Halo pulsation
      const haloScale = 1 + Math.sin(elapsed * 2) * 0.03;
      haloMesh.scale.set(haloScale, haloScale, 1);
      haloMesh.rotation.z += 0.002;

      // Bell ringing resonance shockwave
      if (bellRingingRef.current) {
        altarLight.intensity = 3.5 + Math.sin(elapsed * 18) * 1.5;
        haloMat.opacity = 0.95;
      } else {
        altarLight.intensity = 1.8 + Math.sin(elapsed * 3) * 0.3;
        haloMat.opacity = 0.75;
      }

      // Floating Lotus Petals update
      for (let i = 0; i < petalCount; i++) {
        const p = petalData[i];
        p.y += p.vy;
        p.x += p.vx + Math.sin(elapsed * 1.5 + i) * 0.002;
        p.z += p.vz;
        p.rotX += p.rotSpeedX;
        p.rotY += p.rotSpeedY;

        if (p.y < -1.8) {
          p.y = 3.8;
          p.x = (Math.random() - 0.5) * 8;
          p.z = (Math.random() - 0.5) * 6;
        }

        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(p.rotX, p.rotY, p.rotZ);
        dummy.scale.setScalar(0.7 + (i % 3) * 0.2);
        dummy.updateMatrix();
        petalInstanced.setMatrixAt(i, dummy.matrix);
      }
      petalInstanced.instanceMatrix.needsUpdate = true;

      // Incense Smoke particles update
      if (incenseLitRef.current) {
        smokePoints.visible = true;
        const positions = smokeGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < smokeCount; i++) {
          const s = smokeData[i];
          s.y += s.vy;
          s.x += s.vx + Math.sin(elapsed * 2 + s.y * 3) * 0.003;

          if (s.y > 2.0) {
            s.y = -0.05;
            s.x = (Math.random() - 0.5) * 0.05;
            s.z = 0.5 + (Math.random() - 0.5) * 0.05;
          }

          positions[i * 3] = s.x;
          positions[i * 3 + 1] = s.y;
          positions[i * 3 + 2] = s.z;
        }
        smokeGeo.attributes.position.needsUpdate = true;
      } else {
        smokePoints.visible = false;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 10. Clean up disposal
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);

      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }

      // Dispose Three.js objects
      baseGeo.dispose();
      baseMat.dispose();
      tier2Geo.dispose();
      tier2Mat.dispose();
      urnGeo.dispose();
      urnMat.dispose();
      stickMat.dispose();
      tipMat.dispose();
      haloGeo.dispose();
      haloMat.dispose();
      discGeo.dispose();
      discMat.dispose();
      petalGeo.dispose();
      petalMat.dispose();
      petalInstanced.dispose();
      smokeGeo.dispose();
      smokeMat.dispose();
      renderer.dispose();
    };
  }, [timeOfDay]);

  return (
    <div
      ref={mountRef}
      className={`relative w-full overflow-hidden select-none touch-none cursor-grab active:cursor-grabbing ${className}`}
      style={{
        background:
          timeOfDay === 'night'
            ? 'radial-gradient(ellipse at bottom, #091224 0%, #03060c 100%)'
            : timeOfDay === 'dusk'
            ? 'radial-gradient(ellipse at bottom, #381324 0%, #0d0814 100%)'
            : 'radial-gradient(ellipse at bottom, #1d2e46 0%, #0d1624 100%)',
      }}
    />
  );
};
