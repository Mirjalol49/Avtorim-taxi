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
    meltProgress: number; // 0 = not melting, 1 = fully melted
}

const LogoSnowEffect: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const snowflakesRef = useRef<Snowflake[]>([]);
    const animationFrameRef = useRef<number>();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size to match logo container
        const resizeCanvas = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.offsetWidth;
                canvas.height = parent.offsetHeight;
            }
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Function to draw a snowflake shape (6-pointed star)
        const drawSnowflake = (x: number, y: number, radius: number, rotation: number, opacity: number, meltProgress: number) => {
            // As melt progresses, reduce size and increase transparency
            const meltedRadius = radius * (1 - meltProgress * 0.7); // Shrink to 30% of original
            const meltedOpacity = opacity * (1 - meltProgress); // Fade out

            if (meltedOpacity <= 0.01) return; // Don't draw if fully melted

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

                // Side branches
                ctx.beginPath();
                ctx.moveTo(0, -meltedRadius * 0.6);
                ctx.lineTo(-meltedRadius * 0.25, -meltedRadius * 0.75);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, -meltedRadius * 0.6);
                ctx.lineTo(meltedRadius * 0.25, -meltedRadius * 0.75);
                ctx.stroke();

                ctx.restore();
            }

            // Center circle
            ctx.beginPath();
            ctx.arc(0, 0, meltedRadius / 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        };

        // Initialize snowflakes
        const createSnowflake = (): Snowflake => ({
            x: Math.random() * canvas.width,
            y: Math.random() * -50, // Start above canvas
            radius: Math.random() * 3 + 2, // 2-5px
            speed: Math.random() * 0.6 + 0.2, // 0.2-0.8 px/frame
            wind: Math.random() * 0.3 - 0.15, // -0.15 to 0.15 px/frame
            opacity: Math.random() * 0.4 + 0.4, // 0.4-0.8
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.02,
            meltProgress: 0,
        });

        // Create initial snowflakes (fewer for logo area)
        const snowflakeCount = 20;
        snowflakesRef.current = Array.from({ length: snowflakeCount }, createSnowflake);

        // Animation loop
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            snowflakesRef.current.forEach((flake, index) => {
                // Update position
                flake.y += flake.speed;
                flake.x += flake.wind;
                flake.rotation += flake.rotationSpeed;

                // Start melting when near bottom (last 30% of canvas height)
                const meltZone = canvas.height * 0.7;
                if (flake.y > meltZone && flake.meltProgress < 1) {
                    // Increase melt progress as it gets closer to bottom
                    const distanceInMeltZone = flake.y - meltZone;
                    const meltZoneHeight = canvas.height - meltZone;
                    flake.meltProgress = Math.min(1, distanceInMeltZone / meltZoneHeight);
                }

                // Reset if fully melted or off screen
                if (flake.meltProgress >= 1 || flake.y > canvas.height + 20) {
                    Object.assign(snowflakesRef.current[index], createSnowflake());
                }
                if (flake.x > canvas.width + 20) {
                    flake.x = -20;
                } else if (flake.x < -20) {
                    flake.x = canvas.width + 20;
                }

                // Draw snowflake with melt effect
                drawSnowflake(flake.x, flake.y, flake.radius, flake.rotation, flake.opacity, flake.meltProgress);
            });

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

        // Cleanup
        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ mixBlendMode: 'screen' }}
        />
    );
};

export default LogoSnowEffect;
