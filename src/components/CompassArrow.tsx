import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  directionDeg: number;
  size?: number;
  color?: string;
}

/** Arrow pointing in the direction wind/current is coming from or heading to. */
export function CompassArrow({ directionDeg, size = 28, color = colors.sea }: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Text style={[styles.arrow, { fontSize: size, color, transform: [{ rotate: `${directionDeg}deg` }] }]}>
        ↑
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontWeight: '900',
  },
});
