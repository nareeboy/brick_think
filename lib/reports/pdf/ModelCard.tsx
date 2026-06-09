import { Image, Text, View } from '@react-pdf/renderer';

import type { ReportStyles } from './styles';

export interface ModelCardData {
  id: string;
  title: string;
  ownerLabel: string;
  imageDataUri: string | null;
  description: string;
  /** The speaker(s)' verbatim transcript, attributed for multi-speaker rooms. */
  transcript?: string | null;
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
  const transcriptParas = data.transcript
    ? data.transcript
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

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
      {transcriptParas.length > 0 && (
        <View style={[styles.transcriptBlock, { borderLeftColor: primary }]}>
          <Text style={[styles.transcriptLabel, { color: primary }]}>In their words</Text>
          {transcriptParas.map((p, i) => (
            <Text key={i} style={styles.transcriptText}>
              {p}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}
