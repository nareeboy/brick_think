import { StyleSheet } from '@react-pdf/renderer';

export const brand = {
  primary: '#5050B8',
  ink: '#0F172A',
  mutedInk: '#475569',
  hairline: '#E2E8F0',
  page: '#FFFFFF',
};

export const styles = StyleSheet.create({
  page: {
    backgroundColor: brand.page,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: 'Geist',
    fontSize: 11,
    color: brand.ink,
    lineHeight: 1.55,
  },
  coverPage: {
    backgroundColor: brand.page,
    padding: 48,
    fontFamily: 'Geist',
    color: brand.ink,
    justifyContent: 'space-between',
  },
  coverAccent: {
    height: 8,
    backgroundColor: brand.primary,
    marginBottom: 32,
  },
  h1: {
    fontFamily: 'Fraunces',
    fontWeight: 600,
    fontSize: 32,
    lineHeight: 1.15,
  },
  h2: {
    fontFamily: 'Fraunces',
    fontWeight: 600,
    fontSize: 20,
    lineHeight: 1.2,
    marginBottom: 6,
  },
  h3: {
    fontFamily: 'Geist',
    fontWeight: 500,
    fontSize: 14,
    marginBottom: 4,
  },
  caption: {
    fontSize: 9,
    color: brand.mutedInk,
  },
  muted: {
    color: brand.mutedInk,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: brand.hairline,
    marginVertical: 16,
  },
  paragraph: {
    marginBottom: 10,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  modelCard: {
    width: '48%',
    borderWidth: 1,
    borderColor: brand.hairline,
    borderRadius: 6,
    padding: 12,
  },
  modelImage: {
    width: '100%',
    height: 140,
    objectFit: 'contain',
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  pageFooter: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: brand.mutedInk,
  },
});
