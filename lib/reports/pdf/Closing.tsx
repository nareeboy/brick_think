import { Page, Text, View } from '@react-pdf/renderer';

import { PageFooter } from './ExecutiveSummary';
import { styles } from './styles';

interface Props {
  body: string;
  sessionTitle: string;
  pageNumber: number;
  totalPages: number;
}

export function Closing(props: Props) {
  const paragraphs = props.body.split(/\n{2,}/).filter(Boolean);
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.h2}>Where to from here</Text>
      <View style={styles.divider} />
      {paragraphs.map((p, i) => (
        <Text key={i} style={styles.paragraph}>{p}</Text>
      ))}
      <PageFooter title={props.sessionTitle} page={props.pageNumber} total={props.totalPages} />
    </Page>
  );
}
