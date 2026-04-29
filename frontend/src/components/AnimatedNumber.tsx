import React, { useEffect, useState } from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';

type Props = {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  style?: StyleProp<TextStyle>;
  testID?: string;
};

export default function AnimatedNumber({
  value,
  duration = 650,
  prefix = '',
  suffix = '',
  decimals = 0,
  style,
  testID,
}: Props) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const start = display;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = Date.now();
    let raf: any;
    const tick = () => {
      const t = Math.min(1, (Date.now() - startTime) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(start + diff * ease);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Text style={style} testID={testID}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </Text>
  );
}
