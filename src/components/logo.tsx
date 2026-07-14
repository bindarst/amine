import Image from 'next/image';

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export function Logo({ width = 150, height = 150, className }: LogoProps) {
  return (
    <Image 
      src="/splash.svg" 
      alt="Lista Logo" 
      width={width} 
      height={height}
      className={className}
      priority
    />
  );
}
