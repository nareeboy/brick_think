import { Page, Text, View, Image } from '@react-pdf/renderer';
import path from 'node:path';

import type { ResolvedBranding } from '@/lib/branding/types';

import type { ReportStyles } from './styles';

interface Props {
  sessionTitle: string;
  orgName: string;
  facilitatorName: string;
  date: string;
  participantCount: number;
  styles: ReportStyles['sheet'];
  branding: ResolvedBranding | null;
}

const brickthinkLogoPath = path.join(process.cwd(), 'public/brand/brickthink-icon-512.png');

export function Cover(props: Props) {
  const { styles, branding } = props;
  const eyebrow = branding
    ? `${branding.displayName.toUpperCase()} · SESSION REPORT`
    : `${props.orgName.toUpperCase()} · SESSION REPORT`;
  const footerName = branding ? branding.displayName : 'BrickThink';
  // On the white default cover, metadata labels + footer keep the original
  // muted-ink caption. On a brand-colour cover, the muted slate is illegible,
  // so use the contrast-aware cover ink (slightly faded for hierarchy).
  const metaCaption = branding ? styles.coverCaption : styles.caption;

  return (
    <Page size="A4" style={styles.coverPage}>
      <View>
        <View style={styles.coverAccent} />
        <Text style={[styles.caption, { color: styles.coverPage.color, marginBottom: 12 }]}>
          {eyebrow}
        </Text>
        <Text style={styles.h1}>{props.sessionTitle}</Text>
      </View>

      <View>
        <View style={{ flexDirection: 'row', gap: 24 }}>
          <View>
            <Text style={metaCaption}>DATE</Text>
            <Text style={{ fontSize: 12 }}>{props.date}</Text>
          </View>
          <View>
            <Text style={metaCaption}>FACILITATOR</Text>
            <Text style={{ fontSize: 12 }}>{props.facilitatorName}</Text>
          </View>
          <View>
            <Text style={metaCaption}>PARTICIPANTS</Text>
            <Text style={{ fontSize: 12 }}>{props.participantCount}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 32, gap: 8 }}>
          {branding ? (
            branding.logoDataUri ? (
              <Image src={branding.logoDataUri} style={{ width: 24, height: 24 }} />
            ) : null
          ) : (
            <Image src={brickthinkLogoPath} style={{ width: 24, height: 24 }} />
          )}
          <Text style={[metaCaption, { fontSize: 10 }]}>{footerName}</Text>
        </View>
      </View>
    </Page>
  );
}
