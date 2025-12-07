import React, { useEffect, useRef } from 'react';

interface Snowflake {
    x: number;
    y: number;
    radius: number;
    speed: number;
    wind: number;
    opacity: number;
    rotation: number;
    rotationSpeed: number;
    meltProgress: number;
    layer: 'front' | 'back';
    wobblePhase: number;
    wobbleSpeed: number;
    wobbleAmount: number;
    stuckTime: number; // How long the flake has been "stuck" at logo level
    isStuck: boolean;
}

const LogoSnowEffect: React.FC = () => {
    const backCanvasRef = useRef<HTMLCanvasElement>(null);
    const frontCanvasRef = useRef<HTMLCanvasElement>(null);
    const snowflakesRef = useRef<Snowflake[]>([]);
    const animationFrameRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        const backCanvas = backCanvasRef.current;
        const frontCanvas = frontCanvasRef.current;
        if (!backCanvas || !frontCanvas) return;

        const backCtx = backCanvas.getContext('2d');
        const frontCtx = frontCanvas.getContext('2d');
        if (!backCtx || !frontCtx) return;

        // Logo hit zone (approximate center area where logo is)
        const getLogoZone = () => {
            const w = backCanvas.width;
            const h = backCanvas.height;
            return {
                left: w * 0.15,
                right: w * 0.85,
                top: h * 0.2,
                bottom: h * 0.8,
            };
        };

        const resizeCanvas = () => {
            const parent = backCanvas.parentElement;
            if (parent) {
                backCanvas.width = parent.offsetWidth;
                backCanvas.height = parent.offsetHeight;
                frontCanvas.width = parent.offsetWidth;
                frontCanvas.height = parent.offsetHeight;
            }
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Draw a detailed snowflake
        const drawSnowflake = (
            ctx: CanvasRenderingContext2D,
            x: number,
            y: number,
            radius: number,
            rotation: number,
            opacity: number,
            meltProgress: number,
            isBack: boolean
        ) => {
            const meltedRadius = radius * (1 - meltProgress * 0.7);
            let meltedOpacity = opacity * (1 - meltProgress);

            // Back layer snowflakes are slightly dimmer (depth effect)
            if (isBack) {
                meltedOpacity *= 0.7;
            }

            if (meltedOpacity <= 0.01) return;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.strokeStyle = `rgba(255, 255, 255, ${meltedOpacity})`;
            ctx.fillStyle = `rgba(255, 255, 255, ${meltedOpacity * 0.8})`;
            ctx.lineWidth = meltedRadius / 8;
            ctx.lineCap = 'round';

            // Draw 6 main branches
            for (let i = 0; i < 6; i++) {
                ctx.save();
                ctx.rotate((Math.PI / 3) * i);

                // Main branch
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -meltedRadius);
                ctx.stroke();

                // Side branches with varied lengths
                const branchLen = meltedRadius * (0.2 + Math.random() * 0.1);
                ctx.beginPath();
                ctx.moveTo(0, -meltedRadius * 0.5);
                ctx.lineTo(-branchLen, -meltedRadius * 0.65);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, -meltedRadius * 0.5);
                ctx.lineTo(branchLen, -meltedRadius * 0.65);
                ctx.stroke();

                // Additional tiny branches for larger flakes
                if (meltedRadius > 3) {
                    ctx.beginPath();
                    ctx.moveTo(0, -meltedRadius * 0.75);
                    ctx.lineTo(-branchLen * 0.6, -meltedRadius * 0.85);
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.moveTo(0, -meltedRadius * 0.75);
                    ctx.lineTo(branchLen * 0.6, -meltedRadius * 0.85);
                    ctx.stroke();
                }

                ctx.restore();
            }

            // Center circle with glow effect
            ctx.beginPath();
            ctx.arc(0, 0, meltedRadius / 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        };

        // Create a snowflake with varied properties
        const createSnowflake = (): Snowflake => {
            const isFront = Math.random() > 0.4; // 60% front, 40% back for more visible front snow
            const baseSpeed = isFront ? 0.4 : 0.25; // Front flakes fall faster (closer = faster perspective)
            const baseRadius = isFront ? 3.5 : 2.5; // Front flakes are larger

            return {
                x: Math.random() * backCanvas.width,
                y: Math.random() * -80 - 20,
                radius: baseRadius + Math.random() * 2,
                speed: baseSpeed + Math.random() * 0.3,
                wind: Math.random() * 0.4 - 0.2,
                opacity: isFront ? 0.6 + Math.random() * 0.3 : 0.3 + Math.random() * 0.3,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.03,
                meltProgress: 0,
                layer: isFront ? 'front' : 'back',
                wobblePhase: Math.random() * Math.PI * 2,
                wobbleSpeed: 0.02 + Math.random() * 0.03,
                wobbleAmount: 0.3 + Math.random() * 0.5,
                stuckTime: 0,
                isStuck: false,
            };
        };

        // Create initial snowflakes
        const snowflakeCount = 30;
        snowflakesRef.current = Array.from({ length: snowflakeCount }, createSnowflake);

        // Animation loop
        let frameCount = 0;
        const animate = () => {
            frameCount++;
            backCtx.clearRect(0, 0, backCanvas.width, backCanvas.height);
            frontCtx.clearRect(0, 0, frontCanvas.width, frontCanvas.height);

            const logoZone = getLogoZone();

            snowflakesRef.current.forEach((flake, index) => {
                // Wobble effect (sinusoidal horizontal movement)
                flake.wobblePhase += flake.wobbleSpeed;
                const wobbleOffset = Math.sin(flake.wobblePhase) * flake.wobbleAmount;

                // Check if flake is in logo zone
                const inLogoZone =
                    flake.x > logoZone.left &&
                    flake.x < logoZone.right &&
                    flake.y > logoZone.top &&
                    flake.y < logoZone.bottom;

                // Accumulation / sticking effect for front layer flakes hitting logo area
                if (flake.layer === 'front' && inLogoZone && !flake.isStuck && Math.random() < 0.01) {
                    flake.isStuck = true;
                    flake.stuckTime = 0;
                }

                if (flake.isStuck) {
                    flake.stuckTime++;
                    // Slowly melt while stuck
                    flake.meltProgress = Math.min(1, flake.stuckTime / 120);
                    flake.speed = 0.05; // Slow creep down

                    if (flake.stuckTime > 120) {
                        flake.isStuck = false;
                    }
                } else {
                    // Normal movement
                    flake.y += flake.speed;
                    flake.x += flake.wind + wobbleOffset * 0.1;
                    flake.rotation += flake.rotationSpeed;

                    // Natural melt zone at bottom
                    const meltZone = backCanvas.height * 0.75;
                    if (flake.y > meltZone && flake.meltProgress < 1) {
                        const distanceInMeltZone = flake.y - meltZone;
                        const meltZoneHeight = backCanvas.height - meltZone;
                        flake.meltProgress = Math.min(1, distanceInMeltZone / meltZoneHeight);
                    }
                }

                // Reset if melted or off screen
                if (flake.meltProgress >= 1 || flake.y > backCanvas.height + 30) {
                    Object.assign(snowflakesRef.current[index], createSnowflake());
                }

                // Wrap horizontally
                if (flake.x > backCanvas.width + 30) {
                    flake.x = -30;
                } else if (flake.x < -30) {
                    flake.x = backCanvas.width + 30;
                }

                // Draw on appropriate layer
                const ctx = flake.layer === 'front' ? frontCtx : backCtx;
                const isBack = flake.layer === 'back';
                drawSnowflake(
                    ctx,
                    flake.x,
                    flake.y,
                    flake.radius,
                    flake.rotation,
                    flake.opacity,
                    flake.meltProgress,
                    isBack
                );
            });

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    return (
        <>
            {/* Background snow - behind logo (z-index 0) */}
            <canvas
                ref={backCanvasRef}
                className="absolute inset-0 pointer-events-none"
                style={{ zIndex: 0 }}
            />
            {/* Foreground snow - in front of logo (z-index 10) */}
            <canvas
                ref={frontCanvasRef}
                className="absolute inset-0 pointer-events-none"
                style={{ zIndex: 10 }}
            />
        </>
    );
};

export default LogoSnowEffect;
