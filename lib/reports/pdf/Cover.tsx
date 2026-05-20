import { Page, Text, View, Image } from '@react-pdf/renderer';
import path from 'node:path';

import { styles, brand } from './styles';

interface Props {
  sessionTitle: string;
  orgName: string;
  facilitatorName: string;
  date: string;
  participantCount: number;
}

const logoPath = path.join(process.cwd(), 'public/brand/brickthink-icon-512.png');

export function Cover(props: Props) {
  return (
    <Page size="A4" style={styles.coverPage}>
      <View>
        <View style={styles.coverAccent} />
        <Text style={[styles.caption, { color: brand.primary, marginBottom: 12 }]}>
          {props.orgName.toUpperCase()} · SESSION REPORT
        </Text>
        <Text style={styles.h1}>{props.sessionTitle}</Text>
      </View>

      <View>
        <View style={{ flexDirection: 'row', gap: 24 }}>
          <View>
            <Text style={styles.caption}>DATE</Text>
            <Text style={{ fontSize: 12 }}>{props.date}</Text>
          </View>
          <View>
            <Text style={styles.caption}>FACILITATOR</Text>
            <Text style={{ fontSize: 12 }}>{props.facilitatorName}</Text>
          </View>
          <View>
            <Text style={styles.caption}>PARTICIPANTS</Text>
            <Text style={{ fontSize: 12 }}>{props.participantCount}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 32, gap: 8 }}>
          <Image src={logoPath} style={{ width: 24, height: 24 }} />
          <Text style={[styles.caption, { fontSize: 10 }]}>BrickThink</Text>
        </View>
      </View>
    </Page>
  );
}
