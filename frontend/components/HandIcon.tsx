import type { HandPoseType } from '@/lib/types';

const HAND_TO_NUMBER: Record<HandPoseType, string> = {
  fist:     '/numbers/bubble-0.svg',
  one:      '/numbers/bubble-1.svg',
  peace:    '/numbers/bubble-2.svg',
  three:    '/numbers/bubble-3.svg',
  four:     '/numbers/bubble-4.svg',
  open:     '/numbers/bubble-5.svg',
  heart:    '/numbers/bubble-1.svg',
  flat:     '/numbers/bubble-5.svg',
  pointing: '/numbers/bubble-1.svg',
};

interface HandIconProps {
  leftHand: HandPoseType;
  rightHand: HandPoseType;
}

export function HandIcon({ leftHand, rightHand }: HandIconProps) {
  return (
    <div className="flex gap-1 items-center h-14">
      <img
        src={HAND_TO_NUMBER[leftHand]}
        alt={leftHand}
        className="h-14 w-auto object-contain"
        draggable={false}
      />
      <img
        src={HAND_TO_NUMBER[rightHand]}
        alt={rightHand}
        className="h-14 w-auto object-contain"
        draggable={false}
      />
    </div>
  );
}
