import { Page, Text, View } from '@react-pdf/renderer';

import { ModelCard, type ModelCardData } from './ModelCard';
import { PageFooter } from './ExecutiveSummary';
import type { ReportStyles } from './styles';

const STAGE_LABELS: Record<string, string> = {
  skill_building: 'Skill building',
  individual_model: 'Individual models',
  shared_model: 'Shared models',
  system_model: 'System model',
  guiding_principles: 'Guiding principles',
};

const STAGE_INTENTS: Record<string, string> = {
  skill_building: 'Warming up — building shared vocabulary with the bricks.',
  individual_model: 'Each participant built their own model of the question.',
  shared_model: 'Small groups merged their individual models into a shared one.',
  system_model: 'Groups mapped how the shared models connect into a system.',
  guiding_principles: 'Distilling the principles that hold the system together.',
};

interface Props {
  stageType: string;
  models: ModelCardData[];
  sessionTitle: string;
  pageNumber: number;
  totalPages: number;
  styles: ReportStyles['sheet'];
  footerLabel: string;
  primary: string;
  mutedInk: string;
}

export function StageSection({
  stageType,
  models,
  sessionTitle,
  pageNumber,
  totalPages,
  styles,
  footerLabel,
  primary,
  mutedInk,
}: Props) {
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.h2}>{STAGE_LABELS[stageType] ?? stageType}</Text>
      <Text style={[styles.muted, { marginBottom: 8 }]}>{STAGE_INTENTS[stageType] ?? ''}</Text>
      <View style={styles.divider} />
      <View style={styles.cardGrid}>
        {models.map((m) => (
          <ModelCard key={m.id} data={m} styles={styles} primary={primary} mutedInk={mutedInk} />
        ))}
      </View>
      <PageFooter
        label={footerLabel}
        title={sessionTitle}
        page={pageNumber}
        total={totalPages}
        styles={styles}
      />
    </Page>
  );
}
