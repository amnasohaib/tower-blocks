class TowerBlocks {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.autoClear = false;

    this.blocks = [];
    this.currentBlock = null;
    this.gameState = "waiting";
    this.score = 0;
    this.movingDirection = "x";
    this.blockSpeed = 0.06;
    this.cameraTargetY = 5;

    this.initialBlockWidth = 3;
    this.initialBlockHeight = 1;
    this.initialBlockDepth = 3;

    this.glassMaterialSettings = {
      transparent: true,
      opacity: 3,
      transmission: 0.5,
    };

    this.glassColors = [
      0x5e9aa4, 0xe0b0d5, 0x904e55, 0x8d6a9f, 0xe0a458, 0x71b48d,
    ];

    this.init();
    this.setupEventListeners();
    this.animate();
  }

  init() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document
      .getElementById("gameContainer")
      .appendChild(this.renderer.domElement);

    this.camera.position.set(8, 10, 8);
    this.camera.lookAt(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.createBaseBlock();
  }

  createBaseBlock() {
    const geometry = new THREE.BoxGeometry(
      this.initialBlockWidth,
      this.initialBlockHeight,
      this.initialBlockDepth
    );

    const glassColor =
      this.glassColors[Math.floor(Math.random() * this.glassColors.length)];

    const material = new THREE.MeshPhysicalMaterial({
      ...this.glassMaterialSettings,
      color: new THREE.Color(glassColor),
      emissive: new THREE.Color(glassColor).multiplyScalar(0.2),
    });

    const block = new THREE.Mesh(geometry, material);
    block.position.set(0, 0, 0);
    block.castShadow = true;
    block.receiveShadow = true;

    this.scene.add(block);
    this.blocks.push({
      mesh: block,
      width: this.initialBlockWidth,
      height: this.initialBlockHeight,
      depth: this.initialBlockDepth,
      x: 0,
      z: 0,
    });
  }

  gameStart() {
    if (this.gameState !== "waiting") return;

    this.gameState = "playing";
    document.getElementById("instructions").textContent =
      "press spacebar to drop blocks and score points.";
    this.spawnMovingBlock();
  }

  spawnMovingBlock() {
    const lastBlock = this.blocks[this.blocks.length - 1];
    const y = this.blocks.length * this.initialBlockHeight;

    const geometry = new THREE.BoxGeometry(
      lastBlock.width,
      lastBlock.height,
      lastBlock.depth
    );

    let glassColor;
    do {
      glassColor =
        this.glassColors[Math.floor(Math.random() * this.glassColors.length)];
    } while (glassColor === lastBlock.mesh.material.color.getHex());

    const material = new THREE.MeshPhysicalMaterial({
      ...this.glassMaterialSettings,
      color: new THREE.Color(glassColor),
      emissive: new THREE.Color(glassColor).multiplyScalar(0.2),
    });

    this.currentBlock = new THREE.Mesh(geometry, material);
    this.currentBlock.castShadow = true;
    this.currentBlock.receiveShadow = true;

    this.currentBlock.userData.width = lastBlock.width;
    this.currentBlock.userData.height = lastBlock.height;
    this.currentBlock.userData.depth = lastBlock.depth;

    if (this.movingDirection === "x") {
      this.currentBlock.position.set(-8, y, lastBlock.z);
      this.currentBlock.userData.direction = "x";
      this.currentBlock.userData.speed = this.blockSpeed;
    } else {
      this.currentBlock.position.set(lastBlock.x, y, -8);
      this.currentBlock.userData.direction = "z";
      this.currentBlock.userData.speed = this.blockSpeed;
    }

    this.scene.add(this.currentBlock);
  }

  dropBlock() {
    if (!this.currentBlock || this.gameState !== "playing") return;

    const lastBlock = this.blocks[this.blocks.length - 1];
    const currentPos = this.currentBlock.position;
    const currentWidth = this.currentBlock.userData.width;
    const currentDepth = this.currentBlock.userData.depth;

    let overlap, newWidth, newDepth, newX, newZ;

    if (this.movingDirection === "x") {
      const overlapStart = Math.max(
        currentPos.x - currentWidth / 2,
        lastBlock.x - lastBlock.width / 2
      );
      const overlapEnd = Math.min(
        currentPos.x + currentWidth / 2,
        lastBlock.x + lastBlock.width / 2
      );
      overlap = Math.max(0, overlapEnd - overlapStart);

      newWidth = overlap;
      newDepth = currentDepth;
      newX = (overlapStart + overlapEnd) / 2;
      newZ = currentPos.z;
    } else {
      const overlapStart = Math.max(
        currentPos.z - currentDepth / 2,
        lastBlock.z - lastBlock.depth / 2
      );
      const overlapEnd = Math.min(
        currentPos.z + currentDepth / 2,
        lastBlock.z + lastBlock.depth / 2
      );
      overlap = Math.max(0, overlapEnd - overlapStart);

      newWidth = currentWidth;
      newDepth = overlap;
      newX = currentPos.x;
      newZ = (overlapStart + overlapEnd) / 2;
    }

    if (overlap <= 0.1) {
      this.gameOver();
      return;
    }

    this.scene.remove(this.currentBlock);

    const cutGeometry = new THREE.BoxGeometry(
      newWidth,
      this.initialBlockHeight,
      newDepth
    );
    const cutBlock = new THREE.Mesh(cutGeometry, this.currentBlock.material);
    cutBlock.position.set(newX, currentPos.y, newZ);
    cutBlock.castShadow = true;
    cutBlock.receiveShadow = true;

    this.scene.add(cutBlock);

    this.blocks.push({
      mesh: cutBlock,
      width: newWidth,
      height: this.initialBlockHeight,
      depth: newDepth,
      x: newX,
      z: newZ,
    });

    this.createFallingPiece(
      currentPos,
      newX,
      newZ,
      newWidth,
      newDepth,
      currentWidth,
      currentDepth
    );

    this.score++;
    document.getElementById("score").textContent = `Score: ${this.score}`;

    this.blockSpeed = Math.min(this.blockSpeed + 0.01, 0.2);

    this.movingDirection = this.movingDirection === "x" ? "z" : "x";

    this.updateCamera();

    this.currentBlock = null;

    setTimeout(() => {
      if (this.gameState === "playing") {
        this.spawnMovingBlock();
      }
    }, 200);
  }

  createFallingPiece(
    originalPos,
    newX,
    newZ,
    newWidth,
    newDepth,
    originalWidth,
    originalDepth
  ) {
    if (this.movingDirection === "x") {
      const cutWidth = originalWidth - newWidth;

      if (cutWidth > 0.1) {
        const fallX =
          originalPos.x > newX
            ? newX + newWidth / 2 + cutWidth / 2
            : newX - newWidth / 2 - cutWidth / 2;

        const fallGeometry = new THREE.BoxGeometry(
          cutWidth,
          this.initialBlockHeight,
          originalDepth
        );
        const fallBlock = new THREE.Mesh(
          fallGeometry,
          this.currentBlock.material
        );
        fallBlock.position.set(fallX, originalPos.y, originalPos.z);

        this.scene.add(fallBlock);
        this.animateFallingBlock(fallBlock);
      }
    } else {
      const cutDepth = originalDepth - newDepth;

      if (cutDepth > 0.1) {
        const fallZ =
          originalPos.z > newZ
            ? newZ + newDepth / 2 + cutDepth / 2
            : newZ - newDepth / 2 - cutDepth / 2;

        const fallGeometry = new THREE.BoxGeometry(
          originalWidth,
          this.initialBlockHeight,
          cutDepth
        );
        const fallBlock = new THREE.Mesh(
          fallGeometry,
          this.currentBlock.material
        );
        fallBlock.position.set(originalPos.x, originalPos.y, fallZ);

        this.scene.add(fallBlock);
        this.animateFallingBlock(fallBlock);
      }
    }
  }

  animateFallingBlock(block) {
    const fallSpeed = 0.1;
    const rotationSpeed = 0.01;

    const animate = () => {
      block.position.y -= fallSpeed;
      block.rotation.x += rotationSpeed;
      block.rotation.z += rotationSpeed;

      if (block.position.y > -20) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(block);
      }
    };

    animate();
  }

  updateCamera() {
    this.cameraTargetY = this.blocks.length * this.initialBlockHeight + 5;
  }

  gameOver() {
    this.gameState = "gameOver";

    if (this.currentBlock) {
      this.animateFallingBlock(this.currentBlock);
      this.currentBlock = null;
    }

    document.getElementById("finalScore").textContent = this.score;
    document.getElementById("gameOver").style.display = "block";
  }

  restart() {
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }

    this.blocks = [];
    this.currentBlock = null;
    this.gameState = "waiting";
    this.score = 0;
    this.blockSpeed = 0.06;
    this.movingDirection = "x";
    this.cameraTargetY = 5;

    document.getElementById("score").textContent = "score: 0";
    document.getElementById("instructions").textContent =
      "press spacebar to start the game.";
    document.getElementById("gameOver").style.display = "none";

    this.init();
  }

  setupEventListeners() {
    document.addEventListener("keydown", (event) => {
      if (event.code === "Space") {
        event.preventDefault();
        if (this.gameState === "waiting") {
          this.gameStart();
        } else if (this.gameState === "playing") {
          this.dropBlock();
        }
      }
    });

    document.getElementById("restartBtn").addEventListener("click", () => {
      this.restart();
    });

    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.currentBlock && this.gameState === "playing") {
      if (this.currentBlock.userData.direction === "x") {
        this.currentBlock.position.x += this.currentBlock.userData.speed;
        if (
          this.currentBlock.position.x > 8 ||
          this.currentBlock.position.x < -8
        ) {
          this.currentBlock.userData.speed *= -1;
        }
      } else {
        this.currentBlock.position.z += this.currentBlock.userData.speed;
        if (
          this.currentBlock.position.z > 8 ||
          this.currentBlock.position.z < -8
        ) {
          this.currentBlock.userData.speed *= -1;
        }
      }
    }

    const targetY = this.cameraTargetY;
    this.camera.position.y += (targetY - this.camera.position.y) * 0.1;
    this.camera.lookAt(0, this.blocks.length * this.initialBlockHeight - 2, 0);

    this.renderer.render(this.scene, this.camera);
  }
}

const game = new TowerBlocks();
