// ============================================
// SPLASH SCREEN - ANIMATION LOGIC
// ============================================

class SplashScreen {
  constructor() {
    this.splashScreen = document.getElementById('splashScreen');
    this.splashCanvas = document.getElementById('splashCanvas');
    this.isVisible = true;
    this.startTime = Date.now();
    this.duration = 5000; // 5 seconds
    
    this.initThreeJS();
    this.setupInteractions();
    this.startTimer();
  }

  // Initialize Three.js Scene
  initThreeJS() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Scene Setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 50;
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      precision: 'highp'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x0a0e27, 0.1);
    
    this.splashCanvas.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
    
    const pointLight1 = new THREE.PointLight(0xd4af37, 0.8, 500);
    pointLight1.position.set(100, 100, 100);
    this.scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xf0c857, 0.6, 500);
    pointLight2.position.set(-100, -100, 50);
    this.scene.add(pointLight2);

    // Create Floating Particles / Coins
    this.createFloatingElements();
    
    // Handle Window Resize
    window.addEventListener('resize', () => this.onWindowResize());
    
    // Start Animation Loop
    this.animate();
  }

  // Create Floating 3D Elements
  createFloatingElements() {
    this.elements = [];
    
    const geometry = new THREE.IcosahedronGeometry(2, 4);
    const material = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x8f6d00,
      emissiveIntensity: 0.3
    });

    // Reduce particle count on mobile devices
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 8 : 15;

    // Create multiple floating objects
    for (let i = 0; i < particleCount; i++) {
      const mesh = new THREE.Mesh(geometry, material.clone());
      
      const boundaryScale = isMobile ? 120 : 200;
      
      mesh.position.set(
        (Math.random() - 0.5) * boundaryScale,
        (Math.random() - 0.5) * boundaryScale,
        (Math.random() - 0.5) * boundaryScale
      );
      
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      mesh.scale.set(
        Math.random() * 0.5 + 1,
        Math.random() * 0.5 + 1,
        Math.random() * 0.5 + 1
      );

      this.scene.add(mesh);
      
      this.elements.push({
        mesh: mesh,
        vx: (Math.random() - 0.5) * (isMobile ? 0.3 : 0.5),
        vy: (Math.random() - 0.5) * (isMobile ? 0.3 : 0.5),
        vz: (Math.random() - 0.5) * (isMobile ? 0.3 : 0.5),
        rotx: Math.random() * 0.01,
        roty: Math.random() * 0.01,
        rotz: Math.random() * 0.01,
        boundary: isMobile ? 60 : 100
      });
    }

    // Create orbiting ring
    const ringGeometry = new THREE.TorusGeometry(60, 2, 16, 100);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0xf0c857,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0xd4af37,
      emissiveIntensity: 0.5
    });
    
    this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
    this.ring.rotation.x = Math.PI / 4;
    this.ring.rotation.z = Math.random() * Math.PI * 2;
    this.scene.add(this.ring);
  }

  // Animation Loop
  animate = () => {
    requestAnimationFrame(this.animate);

    // Update floating elements
    this.elements.forEach(element => {
      element.mesh.position.x += element.vx;
      element.mesh.position.y += element.vy;
      element.mesh.position.z += element.vz;
      
      element.mesh.rotation.x += element.rotx;
      element.mesh.rotation.y += element.roty;
      element.mesh.rotation.z += element.rotz;

      // Bounce off boundaries
      const boundary = 100;
      if (Math.abs(element.mesh.position.x) > boundary) element.vx *= -1;
      if (Math.abs(element.mesh.position.y) > boundary) element.vy *= -1;
      if (Math.abs(element.mesh.position.z) > boundary) element.vz *= -1;
    });

    // Rotate ring
    if (this.ring) {
      this.ring.rotation.z += 0.001;
      this.ring.rotation.y += 0.0005;
    }

    // Gentle camera movement
    const time = Date.now() * 0.0001;
    this.camera.position.x = Math.sin(time) * 10;
    this.camera.position.y = Math.cos(time) * 8;
    this.camera.lookAt(this.scene.position);

    this.renderer.render(this.scene, this.camera);
  };

  // Handle Window Resize
  onWindowResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  };

  // Setup Click to Skip
  setupInteractions() {
    this.splashScreen.addEventListener('click', () => this.hideSplash());
  }

  // Timer for Auto-hide
  startTimer() {
    setInterval(() => {
      const elapsed = Date.now() - this.startTime;
      
      if (elapsed >= this.duration && this.isVisible) {
        this.hideSplash();
      }
    }, 100);
  }

  // Hide Splash Screen
  hideSplash() {
    if (!this.isVisible) return;
    
    this.isVisible = false;
    
    // Animate out
    gsap.to(this.splashScreen, {
      opacity: 0,
      duration: 0.8,
      ease: 'power2.inOut',
      onComplete: () => {
        this.splashScreen.style.pointerEvents = 'none';
        this.splashScreen.style.display = 'none';
        
        // Cleanup Three.js
        this.renderer.dispose();
      }
    });
  }
}

// Initialize Splash Screen when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Check if splash has already been shown in this session
  if (!sessionStorage.getItem('splashShown')) {
    new SplashScreen();
    sessionStorage.setItem('splashShown', 'true');
  } else {
    // Hide splash immediately if already shown
    const splash = document.getElementById('splashScreen');
    splash.style.display = 'none';
    splash.style.pointerEvents = 'none';
  }
});
