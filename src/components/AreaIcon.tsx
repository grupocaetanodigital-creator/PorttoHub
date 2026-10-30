import React from 'react';
import { AreaType } from '../types';
import { 
  Trophy, 
  Dumbbell, 
  Gamepad2, 
  PartyPopper, 
  Flame, 
  Waves, 
  Briefcase, 
  Sparkles 
} from 'lucide-react';

interface AreaIconProps {
  type: AreaType;
  className?: string;
}

export const AreaIcon: React.FC<AreaIconProps> = ({ type, className = 'w-5 h-5' }) => {
  switch (type) {
    case 'quadra':
      return <Trophy className={className} />;
    case 'academia':
      return <Dumbbell className={className} />;
    case 'jogos':
      return <Gamepad2 className={className} />;
    case 'festa':
      return <PartyPopper className={className} />;
    case 'churrasqueira':
      return <Flame className={className} />;
    case 'piscina':
      return <Waves className={className} />;
    case 'coworking':
      return <Briefcase className={className} />;
    default:
      return <Sparkles className={className} />;
  }
};
