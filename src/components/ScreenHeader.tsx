import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, right }: Props) {
  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: colors.deepSea,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  subtitle: {
    fontSize: 13,
    color: colors.mist,
    marginTop: 2,
  },
});
