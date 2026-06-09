import { Page, Text, View } from '@react-pdf/renderer';

import type { ReportStyles } from './styles';

interface Props {
  sessionTitle: string;
  body: string;
  pageNumber: number;
  totalPages: number;
  styles: ReportStyles['sheet'];
  footerLabel: string;
}

export function ExecutiveSummary(props: Props) {
  const { styles } = props;
  const paragraphs = props.body.split(/\n{2,}/).filter(Boolean);
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.h2}>Executive summary</Text>
      <View style={styles.divider} />
      {paragraphs.map((p, i) => (
        <Text key={i} style={styles.paragraph}>
          {p}
        </Text>
      ))}
      <PageFooter
        label={props.footerLabel}
        title={props.sessionTitle}
        page={props.pageNumber}
        total={props.totalPages}
        styles={styles}
      />
    </Page>
  );
}

export function PageFooter({
  label,
  title,
  styles,
}: {
  label: string;
  title: string;
  /** Accepted for backwards-compat with callers; page numbers are now
   *  computed dynamically by @react-pdf so footers stay correct when a stage
   *  spans more than one page. */
  page?: number;
  total?: number;
  styles: ReportStyles['sheet'];
}) {
  return (
    <View style={styles.pageFooter} fixed>
      <Text>
        {label} · {title}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}
