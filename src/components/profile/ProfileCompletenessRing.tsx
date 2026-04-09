import { motion } from 'framer-motion';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface ProfileCompletenessRingProps {
  percentage: number;
  color: string;
  avatarUrl: string | null;
  initials: string;
}

const ProfileCompletenessRing = ({ percentage, color, avatarUrl, initials }: ProfileCompletenessRingProps) => {
  const size = 120;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0 -rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Avatar className="w-[100px] h-[100px]">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="Profile" /> : null}
            <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
              {initials || '?'}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
      <motion.span
        className="text-sm font-semibold"
        style={{ color }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {percentage}% compleet
      </motion.span>
    </div>
  );
};

export default ProfileCompletenessRing;
