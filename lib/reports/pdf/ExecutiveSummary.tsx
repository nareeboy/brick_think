import { Page, Text, View } from '@react-pdf/renderer';

import { styles } from './styles';

interface Props {
  sessionTitle: string;
  body: string;
  pageNumber: number;
  totalPages: number;
}

export function ExecutiveSummary(props: Props) {
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
      <PageFooter title={props.sessionTitle} page={props.pageNumber} total={props.totalPages} />
    </Page>
  );
}

export function PageFooter({ title, page, total }: { title: string; page: number; total: number }) {
  return (
    <View style={styles.pageFooter} fixed>
      <Text>BrickThink · {title}</Text>
      <Text>
        {page} / {total}
      </Text>
    </View>
  );
}
