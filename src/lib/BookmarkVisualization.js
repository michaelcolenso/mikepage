// src/lib/BookmarkVisualization.js
import * as THREE from 'three';

export class BookmarkVisualization {
    constructor(container) {
        console.log('Initializing BookmarkVisualization with container:', container);
        
        if (!container) {
            console.error('Container element is required');
            return;
        }
        
        this.container = container;
        this.bookmarks = new Map();
        this.tagGroups = new Map();
        this.chunkSize = 100;
        this.currentChunk = 0;
        this.isLoading = false;
        
        console.log('Container dimensions:', {
            width: container.clientWidth,
            height: container.clientHeight
        });
        
        this.init();
    }

    init() {
        console.log('Initializing Three.js scene...');
        
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        // Camera setup
        const aspect = this.container.clientWidth / this.container.clientHeight || 1;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.camera.position.z = 100;
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({
            antialias: false,
            powerPreference: 'high-performance'
        });
        
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio > 1 ? 2 : 1);
        this.container.appendChild(this.renderer.domElement);

        // Setup instanced mesh
        this.setupInstancedMesh();
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 1, 0);
        this.scene.add(directionalLight);

        // Start animation loop
        this.animate();
    }

    setupInstancedMesh() {
        // Create geometries for different detail levels
        this.geometries = {
            high: new THREE.SphereGeometry(0.5, 16, 16),
            medium: new THREE.SphereGeometry(0.5, 8, 8),
            low: new THREE.SphereGeometry(0.5, 4, 4)
        };

        const material = new THREE.MeshPhongMaterial({
            vertexColors: true,
            flatShading: true
        });

        this.instancedMesh = new THREE.InstancedMesh(
            this.geometries.medium,
            material,
            1000
        );
        
        this.instancedMesh.frustumCulled = true;
        this.scene.add(this.instancedMesh);
    }

    async loadBookmarksChunk() {
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            const response = await fetch(
                `/api/bookmarks?chunk=${this.currentChunk}&size=${this.chunkSize}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            if (data.bookmarks.length === 0) {
                this.isLoading = false;
                return;
            }

            await this.processBookmarks(data.bookmarks);
            
            this.currentChunk++;
            this.isLoading = false;
            
            if (data.hasMore) {
                requestAnimationFrame(() => this.loadBookmarksChunk());
            }
        } catch (error) {
            console.error('Error loading bookmarks:', error);
            this.isLoading = false;
        }
    }

    async processBookmarks(bookmarks) {
        const positions = new Float32Array(bookmarks.length * 3);
        const colors = new Float32Array(bookmarks.length * 3);
        
        bookmarks.forEach((bookmark, index) => {
            const position = this.calculateBookmarkPosition(bookmark);
            const color = this.calculateBookmarkColor(bookmark);
            
            const i = index * 3;
            positions[i] = position.x;
            positions[i + 1] = position.y;
            positions[i + 2] = position.z;
            
            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
            
            this.bookmarks.set(bookmark.hash, {
                data: bookmark,
                position: position,
                color: color
            });
        });

        this.updateInstancedMesh(positions, colors);
    }

    calculateBookmarkPosition(bookmark) {
        const tags = bookmark.tags.split(' ');
        const angleStep = (Math.PI * 2) / tags.length;
        const radius = 50;
        const height = Math.random() * 40 - 20;
        const angle = angleStep * (this.bookmarks.size % tags.length);
        
        return new THREE.Vector3(
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius
        );
    }

    calculateBookmarkColor(bookmark) {
        const tags = bookmark.tags.split(' ');
        const hue = (tags.length * 0.1) % 1;
        return new THREE.Color().setHSL(hue, 0.5, 0.5);
    }

    updateInstancedMesh(positions, colors) {
        if (positions.length / 3 > this.instancedMesh.count) {
            this.instancedMesh.count = positions.length / 3;
        }

        for (let i = 0; i < positions.length; i += 3) {
            const matrix = new THREE.Matrix4();
            matrix.setPosition(
                positions[i],
                positions[i + 1],
                positions[i + 2]
            );
            this.instancedMesh.setMatrixAt(i / 3, matrix);
            
            const color = new THREE.Color(
                colors[i],
                colors[i + 1],
                colors[i + 2]
            );
            this.instancedMesh.setColorAt(i / 3, color);
        }

        this.instancedMesh.instanceMatrix.needsUpdate = true;
        if (this.instancedMesh.instanceColor) {
            this.instancedMesh.instanceColor.needsUpdate = true;
        }
    }

    onWindowResize() {
        if (!this.container || !this.camera || !this.renderer) return;
        
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        if (this.instancedMesh) {
            this.instancedMesh.rotation.y += 0.001;
        }
        
        this.render();
    }

    render() {
        if (!this.renderer || !this.scene || !this.camera) return;
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        // Dispose geometries
        Object.values(this.geometries).forEach(geometry => {
            geometry.dispose();
        });
        
        // Dispose materials
        if (this.instancedMesh) {
            this.instancedMesh.material.dispose();
        }
        
        // Dispose renderer
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // Clear maps
        this.bookmarks.clear();
        this.tagGroups.clear();
    }
}