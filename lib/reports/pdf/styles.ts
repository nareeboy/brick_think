import { StyleSheet } from '@react-pdf/renderer';

import type { ResolvedBranding } from '@/lib/branding/types';

export interface ReportPalette {
  primary: string;
  ink: string;
  mutedInk: string;
  hairline: string;
  page: string;
  coverBg: string;
  coverInk: string;
  headingFamily: string;
  bodyFamily: string;
}

const DEFAULT_PALETTE: ReportPalette = {
  primary: '#1f1f1f',
  ink: '#1f1f1f',
  mutedInk: '#475569',
  hairline: '#E2E8F0',
  page: '#FFFFFF',
  coverBg: '#FFFFFF',
  coverInk: '#1f1f1f',
  headingFamily: 'Fraunces',
  bodyFamily: 'Geist',
};

export function paletteFor(branding: ResolvedBranding | null): ReportPalette {
  if (!branding) return DEFAULT_PALETTE;
  return {
    primary: branding.brandColour,
    ink: '#1f1f1f',
    mutedInk: '#475569',
    hairline: '#E2E8F0',
    page: '#FFFFFF',
    coverBg: branding.brandColour,
    coverInk: branding.coverInk,
    headingFamily: branding.headingFamily,
    bodyFamily: branding.bodyFamily,
  };
}

export type ReportStyles = ReturnType<typeof createStyles>;

export function createStyles(branding: ResolvedBranding | null) {
  const c = paletteFor(branding);
  return {
    palette: c,
    sheet: StyleSheet.create({
      page: {
        backgroundColor: c.page,
        paddingTop: 48,
        paddingBottom: 56,
        paddingHorizontal: 48,
        fontFamily: c.bodyFamily,
        fontSize: 11,
        color: c.ink,
        lineHeight: 1.55,
      },
      coverPage: {
        backgroundColor: c.coverBg,
        padding: 48,
        fontFamily: c.bodyFamily,
        color: c.coverInk,
        justifyContent: 'space-between',
      },
      coverAccent: {
        height: 8,
        backgroundColor: branding ? branding.accentColour : c.primary,
        marginBottom: 32,
      },
      h1: { fontFamily: c.headingFamily, fontWeight: 600, fontSize: 32, lineHeight: 1.15 },
      h2: {
        fontFamily: c.headingFamily,
        fontWeight: 600,
        fontSize: 20,
        lineHeight: 1.2,
        marginBottom: 6,
      },
      h3: { fontFamily: c.bodyFamily, fontWeight: 500, fontSize: 14, marginBottom: 4 },
      caption: { fontSize: 9, color: c.mutedInk },
      coverCaption: { fontSize: 9, color: c.coverInk, opacity: 0.85 },
      muted: { color: c.mutedInk },
      divider: { borderBottomWidth: 1, borderBottomColor: c.hairline, marginVertical: 16 },
      paragraph: { marginBottom: 10 },
      cardGrid: { flexDirection: 'column', gap: 16 },
      modelCard: {
        width: '100%',
        borderWidth: 1,
        borderColor: c.hairline,
        borderRadius: 6,
        padding: 16,
      },
      modelImage: {
        width: '100%',
        height: 300,
        objectFit: 'contain',
        marginBottom: 10,
        backgroundColor: '#F8FAFC',
      },
      transcriptBlock: {
        marginTop: 12,
        borderLeftWidth: 2,
        paddingLeft: 12,
      },
      transcriptLabel: {
        fontSize: 8,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 5,
      },
      transcriptText: {
        fontSize: 10,
        color: c.mutedInk,
        lineHeight: 1.5,
        marginBottom: 5,
      },
      pageFooter: {
        position: 'absolute',
        bottom: 24,
        left: 48,
        right: 48,
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 9,
        color: c.mutedInk,
      },
    }),
  };
}
