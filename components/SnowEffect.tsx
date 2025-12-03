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
}

const SnowEffect: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const snowflakesRef = useRef<Snowflake[]>([]);
    const animationFrameRef = useRef<number>();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Function to draw a snowflake shape (6-pointed star)
        const drawSnowflake = (x: number, y: number, radius: number, rotation: number, opacity: number) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
            ctx.lineWidth = radius / 8;
            ctx.lineCap = 'round';

            // Draw 6 main branches
            for (let i = 0; i < 6; i++) {
                ctx.save();
                ctx.rotate((Math.PI / 3) * i);

                // Main branch
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -radius);
                ctx.stroke();

                // Side branches
                ctx.beginPath();
                ctx.moveTo(0, -radius * 0.6);
                ctx.lineTo(-radius * 0.25, -radius * 0.75);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, -radius * 0.6);
                ctx.lineTo(radius * 0.25, -radius * 0.75);
                ctx.stroke();

                ctx.restore();
            }

            // Center circle
            ctx.beginPath();
            ctx.arc(0, 0, radius / 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        };

        // Initialize snowflakes
        const createSnowflake = (): Snowflake => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            radius: Math.random() * 4 + 3, // 3-7px for better visibility
            speed: Math.random() * 0.8 + 0.3, // 0.3-1.1 px/frame (slower for realism)
            wind: Math.random() * 0.4 - 0.2, // -0.2 to 0.2 px/frame
            opacity: Math.random() * 0.4 + 0.4, // 0.4-0.8
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.02, // Slow rotation
        });

        // Create initial snowflakes (reduced count for performance with complex shapes)
        const snowflakeCount = 60;
        snowflakesRef.current = Array.from({ length: snowflakeCount }, createSnowflake);

        // Animation loop
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            snowflakesRef.current.forEach((flake) => {
                // Update position
                flake.y += flake.speed;
                flake.x += flake.wind;
                flake.rotation += flake.rotationSpeed;

                // Reset if off screen
                if (flake.y > canvas.height + 20) {
                    flake.y = -20;
                    flake.x = Math.random() * canvas.width;
                }
                if (flake.x > canvas.width + 20) {
                    flake.x = -20;
                } else if (flake.x < -20) {
                    flake.x = canvas.width + 20;
                }

                // Draw snowflake
                drawSnowflake(flake.x, flake.y, flake.radius, flake.rotation, flake.opacity);
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
            className="fixed inset-0 pointer-events-none z-0"
            style={{ mixBlendMode: 'screen' }}
        />
    );
};

export default SnowEffect;
