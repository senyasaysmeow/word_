// Faulty Terminal WebGL Background
(function () {
    const canvas = document.getElementById('trailCanvas');
    if (!canvas) return;
    
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
    if (!gl) {
        console.warn('WebGL not supported');
        return;
    }
    
    // Configuration (optimized defaults)
    const config = {
        scale: 1,
        gridMul: [2, 1],
        digitSize: 1.5,
        timeScale: 0.3,
        scanlineIntensity: 0.3,
        glitchAmount: 1,
        flickerAmount: 1,
        noiseAmp: 1,
        curvature: 0.2,
        tint: [0.4, 1, 0.6], // Terminal green
        mouseReact: true,
        mouseStrength: 0.2,
        brightness: 0.8,
        dpr: Math.min(window.devicePixelRatio || 1, 1.5) // Capped at 1.5 for performance
    };
    
    // Shaders
    const vertexShader = `
        attribute vec2 position;
        varying vec2 vUv;
        void main() {
            vUv = position * 0.5 + 0.5;
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `;
    
    // OPTIMIZED shader - reduced fbm iterations, removed 9x sampling blur
    const fragmentShader = `
        precision mediump float;
        
        varying vec2 vUv;
        
        uniform float iTime;
        uniform vec3  iResolution;
        uniform float uScale;
        
        uniform vec2  uGridMul;
        uniform float uDigitSize;
        uniform float uScanlineIntensity;
        uniform float uGlitchAmount;
        uniform float uFlickerAmount;
        uniform float uNoiseAmp;
        uniform float uCurvature;
        uniform vec3  uTint;
        uniform vec2  uMouse;
        uniform float uMouseStrength;
        uniform float uUseMouse;
        uniform float uBrightness;
        uniform float uAspect;
        
        float time;
        
        // Optimized hash - single operation
        float hash21(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        // Simplified noise
        float noise(vec2 p) {
            return sin(p.x * 10.0) * sin(p.y * 3.0 + time * 0.3) + 0.2; 
        }
        
        // Simplified fbm - only 2 octaves instead of 3
        float fbm(vec2 p) {
            float f = 0.0;
            float amp = 0.5 * uNoiseAmp;
            
            f += amp * noise(p);
            
            // Single rotation, precomputed sin/cos approximation
            float angle = time * 0.02;
            float c = cos(angle);
            float s = sin(angle);
            p = mat2(c, -s, s, c) * p * 2.0;
            amp *= 0.5;
            
            f += amp * noise(p);
            
            return f;
        }
        
        // Simplified pattern - reduced from 7 fbm calls to 3
        float pattern(vec2 p) {
            float angle = time * 0.1;
            float c = cos(angle);
            float s = sin(angle);
            mat2 rot = mat2(c, -s, s, c);
            
            vec2 q = vec2(fbm(p + 1.0), fbm(rot * p + 1.0));
            return fbm(p + q);
        }
        
        float digit(vec2 p) {
            vec2 grid = uGridMul * 15.0;
            vec2 s = floor(p * grid) / grid;
            p = p * grid;
            
            float intensity = pattern(s * 0.1) * 1.3 - 0.03;
            
            if(uUseMouse > 0.5) {
                vec2 mouseWorld = uMouse * uScale;
                mouseWorld.x *= uAspect;
                float distToMouse = distance(s, mouseWorld);
                float mouseInfluence = exp(-distToMouse * 8.0) * uMouseStrength * 10.0;
                intensity += mouseInfluence;
                intensity += sin(distToMouse * 20.0 - iTime * 5.0) * 0.1 * mouseInfluence;
            }
            
            p = fract(p) * uDigitSize;
            
            float px5 = p.x * 5.0;
            float py5 = (1.0 - p.y) * 5.0;
            
            float i = floor(py5) - 2.0;
            float j = floor(px5) - 2.0;
            float f = (i * i + j * j) * 0.0625;
            
            float isOn = step(0.1, intensity - f);
            float brightness = isOn * (0.2 + fract(py5) * 0.8) * (0.75 + fract(px5) * 0.25);
            
            return step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0) * brightness;
        }
        
        float onOff(float a, float b, float c) {
            return step(c, sin(iTime + a * cos(iTime * b))) * uFlickerAmount;
        }
        
        vec3 getColor(vec2 p) {
            // Scanline effect
            float bar = (step(mod(p.y + time * 20.0, 1.0), 0.2) * 0.4 + 1.0) * uScanlineIntensity;
            
            // Glitch displacement
            float y = p.y - mod(iTime * 0.25, 1.0);
            float window = 1.0 / (1.0 + 50.0 * y * y);
            float displacement = sin(p.y * 20.0 + iTime) * 0.0125 * onOff(4.0, 2.0, 0.8) * (1.0 + cos(iTime * 60.0)) * window;
            p.x += displacement * uGlitchAmount;
            
            // Single digit call instead of 9 (removed blur sampling)
            float d = digit(p);
            
            // Fake glow using smoothstep instead of 9x sampling
            float glow = d * 0.3;
            
            return vec3(d * 0.9 + glow) * bar;
        }
        
        vec2 barrel(vec2 uv) {
            vec2 c = uv * 2.0 - 1.0;
            c *= 1.0 + uCurvature * dot(c, c);
            return c * 0.5 + 0.5;
        }
        
        void main() {
            time = iTime * 0.333333;
            vec2 uv = vUv;
            
            if(uCurvature != 0.0) {
                uv = barrel(uv);
            }
            
            vec2 p = uv * uScale;
            p.x *= uAspect;
            
            vec3 col = getColor(p) * uTint * uBrightness;
            
            gl_FragColor = vec4(col, 1.0);
        }
    `;
    
    // Create shader
    function createShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }
    
    // Create program
    const vs = createShader(gl.VERTEX_SHADER, vertexShader);
    const fs = createShader(gl.FRAGMENT_SHADER, fragmentShader);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        return;
    }
    
    gl.useProgram(program);
    
    // Full screen triangle
    const vertices = new Float32Array([-1, -1, 3, -1, -1, 3]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    
    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    
    // Uniforms
    const uniforms = {
        iTime: gl.getUniformLocation(program, 'iTime'),
        iResolution: gl.getUniformLocation(program, 'iResolution'),
        uScale: gl.getUniformLocation(program, 'uScale'),
        uGridMul: gl.getUniformLocation(program, 'uGridMul'),
        uDigitSize: gl.getUniformLocation(program, 'uDigitSize'),
        uScanlineIntensity: gl.getUniformLocation(program, 'uScanlineIntensity'),
        uGlitchAmount: gl.getUniformLocation(program, 'uGlitchAmount'),
        uFlickerAmount: gl.getUniformLocation(program, 'uFlickerAmount'),
        uNoiseAmp: gl.getUniformLocation(program, 'uNoiseAmp'),
        uCurvature: gl.getUniformLocation(program, 'uCurvature'),
        uTint: gl.getUniformLocation(program, 'uTint'),
        uMouse: gl.getUniformLocation(program, 'uMouse'),
        uMouseStrength: gl.getUniformLocation(program, 'uMouseStrength'),
        uUseMouse: gl.getUniformLocation(program, 'uUseMouse'),
        uBrightness: gl.getUniformLocation(program, 'uBrightness'),
        uAspect: gl.getUniformLocation(program, 'uAspect')
    };
    
    // Set static uniforms
    gl.uniform1f(uniforms.uScale, config.scale);
    gl.uniform2fv(uniforms.uGridMul, config.gridMul);
    gl.uniform1f(uniforms.uDigitSize, config.digitSize);
    gl.uniform1f(uniforms.uScanlineIntensity, config.scanlineIntensity);
    gl.uniform1f(uniforms.uGlitchAmount, config.glitchAmount);
    gl.uniform1f(uniforms.uFlickerAmount, config.flickerAmount);
    gl.uniform1f(uniforms.uNoiseAmp, config.noiseAmp);
    gl.uniform1f(uniforms.uCurvature, config.curvature);
    gl.uniform3fv(uniforms.uTint, config.tint);
    gl.uniform1f(uniforms.uMouseStrength, config.mouseStrength);
    gl.uniform1f(uniforms.uUseMouse, config.mouseReact ? 1 : 0);
    gl.uniform1f(uniforms.uBrightness, config.brightness);
    
    // Mouse tracking
    const mouse = { x: 0.5, y: 0.5 };
    const smoothMouse = { x: 0.5, y: 0.5 };
    
    function handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = (e.clientX - rect.left) / rect.width;
        mouse.y = 1 - (e.clientY - rect.top) / rect.height;
    }
    
    if (config.mouseReact) {
        window.addEventListener('mousemove', handleMouseMove, { passive: true });
    }
    
    // Resize
    function resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const dpr = config.dpr;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform3f(uniforms.iResolution, canvas.width, canvas.height, canvas.width / canvas.height);
        // Pass aspect ratio to shader to prevent pattern squeezing
        const aspect = w / h;
        gl.uniform1f(uniforms.uAspect, aspect);
    }
    
    window.addEventListener('resize', resize);
    resize();
    
    // Animation
    const timeOffset = Math.random() * 100;
    
    function render(t) {
        const elapsed = (t * 0.001 + timeOffset) * config.timeScale;
        gl.uniform1f(uniforms.iTime, elapsed);
        
        // Smooth mouse
        const dampingFactor = 0.08;
        smoothMouse.x += (mouse.x - smoothMouse.x) * dampingFactor;
        smoothMouse.y += (mouse.y - smoothMouse.y) * dampingFactor;
        gl.uniform2f(uniforms.uMouse, smoothMouse.x, smoothMouse.y);
        
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        requestAnimationFrame(render);
    }
    
    requestAnimationFrame(render);
})();
