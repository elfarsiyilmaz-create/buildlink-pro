import { motion } from 'framer-motion';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

const sizes = {
  sm: { icon: 28, text: 'text-lg' },
  md: { icon: 36, text: 'text-xl' },
  lg: { icon: 48, text: 'text-3xl' },
  xl: { icon: 64, text: 'text-4xl' },
};

const Logo = ({ size = 'md', className = '', showText = true }: LogoProps) => {
  const s = sizes[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="rounded-full gradient-primary flex items-center justify-center flex-shrink-0"
        style={{ width: s.icon, height: s.icon }}
      >
        <span className="text-primary-foreground font-black" style={{ fontSize: s.icon * 0.4 }}>
          A
        </span>
      </div>
      {showText && (
        <span className={`font-black tracking-tight text-foreground ${s.text}`}>
          ALHAN GROEP
        </span>
      )}
    </div>
  );
};

export default Logo;
