import { Image, Text, View } from '@react-pdf/renderer';

import type { ReportStyles } from './styles';

export interface ModelCardData {
  id: string;
  title: string;
  ownerLabel: string;
  imageDataUri: string | null;
  description: string;
}

export function ModelCard({
  data,
  styles,
  primary,
  mutedInk,
}: {
  data: ModelCardData;
  styles: ReportStyles['sheet'];
  primary: string;
  mutedInk: string;
}) {
  return (
    <View style={styles.modelCard} wrap={false}>
      {data.imageDataUri ? (
        <Image src={data.imageDataUri} style={styles.modelImage} />
      ) : (
        <View style={[styles.modelImage, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={[styles.caption, { color: mutedInk }]}>No preview</Text>
        </View>
      )}
      <Text style={[styles.caption, { color: primary }]}>{data.ownerLabel}</Text>
      <Text style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{data.title}</Text>
      <Text style={[styles.muted, { fontSize: 10 }]}>{data.description}</Text>
    </View>
  );
}
