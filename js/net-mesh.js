/* ===================================================================
   NET MESH — signature WebGL element
   A lattice of connected nodes that ripples like a net cast over dark
   water. Mouse proximity lifts nearby nodes toward the viewer and
   brightens the connecting threads, echoing how a real net responds
   to a pull on the line.
   =================================================================== */

(function () {
  function initNetMesh(canvasId, opts) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof THREE === 'undefined') return;

    const options = Object.assign({
      density: 22,        // nodes per row, roughly
      spread: 1,           // overall scale of field
      autoRotate: true,
      interactive: true,
      colorA: 0xd6002b,
      colorB: 0x0090b8,
      intensity: 1,
    }, opts || {});

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0.6, 9);

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / Math.max(rect.height, 1);
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    // ---- Build the net lattice ----
    const ROWS = options.density;
    const COLS = Math.round(options.density * 1.6);
    const SPACING = 0.62 * options.spread;

    const nodeCount = ROWS * COLS;
    const basePositions = new Float32Array(nodeCount * 3);
    const nodeIndex = (r, c) => r * COLS + c;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = nodeIndex(r, c);
        const x = (c - COLS / 2) * SPACING;
        const y = (r - ROWS / 2) * SPACING;
        // gentle natural sag, like net hanging
        const sag = -Math.pow(x / (COLS * SPACING * 0.5), 2) * 0.6;
        basePositions[i * 3 + 0] = x;
        basePositions[i * 3 + 1] = y + sag;
        basePositions[i * 3 + 2] = (Math.sin(r * 0.7) + Math.cos(c * 0.5)) * 0.25;
      }
    }

    // Lines: connect each node to right + down neighbor (diamond net pattern)
    const linePositions = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = nodeIndex(r, c);
        const x0 = basePositions[i * 3 + 0];
        const y0 = basePositions[i * 3 + 1];
        const z0 = basePositions[i * 3 + 2];
        if (c < COLS - 1) {
          const j = nodeIndex(r, c + 1);
          linePositions.push(x0, y0, z0, basePositions[j*3], basePositions[j*3+1], basePositions[j*3+2]);
        }
        if (r < ROWS - 1) {
          const j = nodeIndex(r + 1, c);
          linePositions.push(x0, y0, z0, basePositions[j*3], basePositions[j*3+1], basePositions[j*3+2]);
        }
      }
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePositions), 3));

    const lineMat = new THREE.LineBasicMaterial({
      color: options.colorB,
      transparent: true,
      opacity: 0.16 * options.intensity,
    });
    const lineMesh = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lineMesh);

    // Nodes as glowing points
    const ptGeo = new THREE.BufferGeometry();
    ptGeo.setAttribute('position', new THREE.BufferAttribute(basePositions.slice(), 3));

    const ptMat = new THREE.PointsMaterial({
      color: options.colorA,
      size: 0.045,
      transparent: true,
      opacity: 0.85 * options.intensity,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(ptGeo, ptMat);
    scene.add(points);

    // Ambient particle drift (loose "catch" sparks) behind the mesh
    const SPARKS = 140;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(SPARKS * 3);
    for (let i = 0; i < SPARKS; i++) {
      sparkPos[i*3] = (Math.random() - 0.5) * 16;
      sparkPos[i*3+1] = (Math.random() - 0.5) * 9;
      sparkPos[i*3+2] = (Math.random() - 0.5) * 8 - 2;
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: options.colorA,
      size: 0.02,
      transparent: true,
      opacity: 0.4,
    });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparks);

    // ---- Interaction state ----
    let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
    if (options.interactive && !prefersReduced) {
      canvas.parentElement.addEventListener('mousemove', (e) => {
        const rect = canvas.parentElement.getBoundingClientRect();
        mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      });
    }

    const clock = new THREE.Clock();
    const posAttr = ptGeo.getAttribute('position');
    const linePosAttr = lineGeo.getAttribute('position');

    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      targetX += (mouseX - targetX) * 0.04;
      targetY += (mouseY - targetY) * 0.04;

      if (!prefersReduced) {
        // ripple the net like water/wind, plus a pull toward the cursor
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const i = nodeIndex(r, c);
            const bx = basePositions[i*3], by = basePositions[i*3+1], bz = basePositions[i*3+2];
            const ripple = Math.sin(t * 0.6 + bx * 0.5 + by * 0.4) * 0.12;

            const dx = bx / 7 - targetX * 2.2;
            const dy = by / 4 - targetY * 1.2;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const pull = Math.max(0, 1 - dist * 0.9) * 0.9;

            posAttr.array[i*3 + 2] = bz + ripple + pull;
          }
        }
        posAttr.needsUpdate = true;

        // mirror node z into line endpoints
        let li = 0;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const i = nodeIndex(r, c);
            if (c < COLS - 1) {
              linePosAttr.array[li*6 + 2] = posAttr.array[i*3+2];
              const j = nodeIndex(r, c+1);
              linePosAttr.array[li*6 + 5] = posAttr.array[j*3+2];
              li++;
            }
            if (r < ROWS - 1) {
              linePosAttr.array[li*6 + 2] = posAttr.array[i*3+2];
              const j = nodeIndex(r+1, c);
              linePosAttr.array[li*6 + 5] = posAttr.array[j*3+2];
              li++;
            }
          }
        }
        linePosAttr.needsUpdate = true;

        sparks.rotation.y = t * 0.02;
        sparks.position.y = Math.sin(t * 0.15) * 0.3;
      }

      if (options.autoRotate && !prefersReduced) {
        scene.rotation.y = targetX * 0.15 + Math.sin(t * 0.05) * 0.04;
        scene.rotation.x = -targetY * 0.08;
      }

      renderer.render(scene, camera);
    }
    animate();
  }

  window.SunmaNetMesh = { init: initNetMesh };
})();
